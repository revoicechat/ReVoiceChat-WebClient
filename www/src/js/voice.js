const voice = {
    activeRoom: null,
    encoder: null,
    socket: null,
    buffer: [],
    bufferMaxLength: 960, // 48,000 samples / sec × 0.020 sec = 960 samples
    sampleRate: 48000,
    bitrate: 64000,
    frameDuration: 20000,
    audioTimestamp: 0,
    users: {},
    audioContext: null,
    selfMute: false,
}

const voiceCodecConfig = {
    codec: "opus",
    sampleRate: voice.sampleRate,
    numberOfChannels: 1,
    bitrate: voice.bitrate,
    bitrateMode: "variable",
    opus: {
        application: "voip",
        complexity: 9,
        signal: "voice",
        usedtx: true,
        frameDuration: voice.frameDuration, //20ms
        useinbanddec: true,
    },
}

// <user> call this function to join a call in a room
async function voiceJoin(roomId) {
    console.info(`VOICE : Initiate join on room: ${roomId}`);
    voice.activeRoom = roomId;

    try {
        // Init WebSocket
        voice.socket = new WebSocket(`${global.url.voice}/${roomId}?token=${global.jwtToken}`);
        voice.socket.binaryType = "arraybuffer";

        // Init send
        await voiceSendInit();
        await voiceUpdateJoinedUsers();

        // Init AudioContext
        voice.audioContext = new AudioContext({ sampleRate: voice.sampleRate });
        await voice.audioContext.audioWorklet.addModule('src/js/lib/voicePcmCollector.js');

        /* Starting here is capture stuff */
        // Init Mic capture
        const micSource = voice.audioContext.createMediaStreamSource(await navigator.mediaDevices.getUserMedia({ audio: true }));

        // Init AudioWorklet
        const workletNode = new AudioWorkletNode(voice.audioContext, "PcmCollector");
        micSource.connect(workletNode);

        workletNode.port.onmessage = (event) => {
            // We don't do anything if we are self muted
            if (voice.selfMute) {
                return;
            }

            const samples = event.data;

            // Push samples to buffer
            voice.buffer.push(...samples);

            // While buffer is full
            while (voice.buffer.length >= voice.bufferMaxLength) {
                // Get 1 audio frames
                const frame = voice.buffer.slice(0, 960);

                // Remove this frame from buffer
                voice.buffer = voice.buffer.slice(960);

                // Create audioData object to feed encoder
                const audioData = new AudioData({
                    format: "f32-planar",
                    sampleRate: voice.sampleRate,
                    numberOfFrames: frame.length,
                    numberOfChannels: 1,
                    timestamp: voice.audioTimestamp,
                    data: new Float32Array(frame).buffer
                });

                // Feed encoder
                if (voice.encoder !== null && voice.encoder.state === "configured") {
                    voice.encoder.encode(audioData);
                }

                audioData.close();

                // Update audioTimestamp (add 20ms / 20000µs)
                voice.audioTimestamp += 20000;
            }
        }

        console.info("VOICE : Room joined");
        document.getElementById(roomId).classList.add('active-voice');
        voice.activeRoom = roomId;
        voiceUpdateSelfControls();

        /* Starting here is playback stuff */
        voice.socket.onmessage = (event) => {
            const data = event.data;
            const view = new DataView(data);

            // Read and decode 2 bytes header
            const headerLength = view.getUint16(0);
            const headerEnd = 2 + headerLength;
            const headerBytes = new Uint8Array(data.slice(2, headerEnd));
            const headerJSON = new TextDecoder().decode(headerBytes);
            const header = JSON.parse(headerJSON);

            // If user sending packet is muted, we stop
            if (voice.users[header.user].muted) {
                return;
            }

            // Decode and read audio
            const audioArrayBuffer = data.slice(headerEnd);
            const audioChunk = new EncodedAudioChunk({
                type: "key",
                timestamp: header.audioTimestamp,
                data: new Uint8Array(audioArrayBuffer),
            })

            if (voice.users[header.user] !== null && voice.users[header.user] !== undefined) {
                const currentUser = voice.users[header.user];
                if (currentUser.decoder !== null && currentUser.decoder.state === "configured") {
                    currentUser.decoder.decode(audioChunk);
                }
            }
            else {
                console.error("VOICE : User decoder don't exist");
            }
        };

        // Socket state
        voice.socket.onopen = () => console.debug('VOICE : WebSocket open');
        voice.socket.onclose = () => console.debug('VOICE : WebSocket closed');
        voice.socket.onerror = (e) => console.error('VOICE : WebSocket error:', e);
    }
    catch (error) {
        console.error(error);

        voice.activeRoom = null;
        if (voice.socket !== null) {
            voice.socket.close();
        }
    }
}

// <user> call this function to leave a call in a room
async function voiceLeave() {
    if (voice.activeRoom !== null) {
        const roomId = voice.activeRoom;
        console.info(`VOICE : Leaving voice chat ${roomId}`);
        document.getElementById(roomId).classList.remove('active-voice');
    }

    voice.activeRoom = null;

    // Close WebSocket
    if (voice.socket !== null) {
        voice.socket.close();
    }

    // Flush and close all decoders
    for (const [key, user] of Object.entries(voice.users)) {
        if (user.decoder !== null) {
            await user.decoder.flush();
            await user.decoder.close();
        }
    };
    console.debug("VOICE : All users decoder flushed and closed");

    // Close self encoder
    if (voice.encoder !== null) {
        voice.encoder.close();
        console.debug("VOICE : Encoder closed");
    }

    // Close audioContext
    if (voice.audioContext !== null) {
        voice.audioContext.close();
        console.debug("VOICE : AudioContext closed");
    }

    voiceUpdateSelfControls();
    voiceUpdateJoinedUsers();
    voice.users = {};
}

// <server.js> call this when a new user join the room
async function voiceUserJoining(userData) {
    const voiceContent = document.getElementById("voice-content");
    const userPfpExist = await fileExistMedia(`/profiles/${userData.id}`);
    voiceContent.appendChild(voiceCreateUserHTML(userData, userPfpExist));

    // User joining this is NOT self and current user is connected to voice room
    if (userData.id !== global.user.id && voice.socket !== null && voice.socket.readyState === WebSocket.OPEN) {
        await voiceCreateUserDecoder(userData.id);
        voiceUpdateUserControls(userData.id);
    }
}

// <server.js> call this when a user leave the room
async function voiceUserLeaving(userId) {
    // Remove user from UI
    document.getElementById(`voice-${userId}`).remove();

    // User calling this is NOT self
    if (userId !== global.user.id && voice.socket.currentState === WebSocket.OPEN) {
        const user = voice.users[userId];
        await user.decoder.flush();
        await user.decoder.close();
        voice.users[userId] = null;
    }
}

// <voiceJoin> call this function to setup encoder and send audio
async function voiceSendInit() {
    const supported = await AudioEncoder.isConfigSupported(voiceCodecConfig);
    if (supported.supported) {
        // Setup Encoder
        voice.encoder = new AudioEncoder({
            output: encoderCallback,
            error: (error) => { throw Error(`Error during encoder setup:\n${error}\nCurrent codec :${voiceCodecConfig}`) },
        });

        voice.encoder.configure(voiceCodecConfig)
        return true;
    }

    // When encoder is done, it call this function to send data through the WebSocket
    function encoderCallback(audioChunk) {
        // Get a copy of audioChunk and audioTimestamp
        const audioTimestamp = voice.audioTimestamp;
        const audioChunkCopy = new ArrayBuffer(audioChunk.byteLength);
        audioChunk.copyTo(audioChunkCopy);

        // Create Header to send with audioChunk
        const header = JSON.stringify({
            timestamp: Date.now(),
            audioTimestamp: audioTimestamp / 1000, // audioTimestamp is in µs but sending ms is enough
            user: global.user.id,
        })
        const headerBytes = new TextEncoder().encode(header);

        // Calculate length of packet
        const packetLength = 2 + headerBytes.length + audioChunkCopy.byteLength;

        // Create packet of that length
        const packet = new Uint8Array(packetLength);

        // Fill packet
        const view = new DataView(packet.buffer);
        view.setUint16(0, headerBytes.length);
        packet.set(headerBytes, 2);
        packet.set(new Uint8Array(audioChunkCopy), 2 + headerBytes.length);

        // Finally send it ! (but socket need to be open)
        if (voice.socket.readyState === WebSocket.OPEN) {
            voice.socket.send(packet);
        }
    }
}

// Create a user audio decoder
async function voiceCreateUserDecoder(userId) {
    console.debug("VOICE : Creating decoder for user:", userId);

    const isSupported = await AudioDecoder.isConfigSupported(voiceCodecConfig);
    if (isSupported.supported) {
        voice.users[userId] = { decoder: null, playhead: 0, muted: false };

        voice.users[userId].decoder = new AudioDecoder({
            output: decoderCallback,
            error: (error) => { throw Error(`Error during decoder setup:\n${error}\nCurrent codec :${voiceCodecConfig}`) },
        });

        voice.users[userId].decoder.configure(voiceCodecConfig)
        voice.users[userId].playhead = 0;
    }

    function decoderCallback(audioData) {
        const buffer = voice.audioContext.createBuffer(
            audioData.numberOfChannels,
            audioData.numberOfFrames,
            audioData.sampleRate
        );

        const channelData = new Float32Array(audioData.numberOfFrames);
        audioData.copyTo(channelData, { planeIndex: 0 });
        buffer.copyToChannel(channelData, 0);

        // Play the AudioBuffer
        const source = voice.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(voice.audioContext.destination);

        voice.users[userId].playhead = Math.max(voice.users[userId].playhead, voice.audioContext.currentTime) + buffer.duration;
        source.start(voice.users[userId].playhead);
        audioData.close();
    }
}

// Show to user who is connected in a room before joinning the call
async function voiceShowConnnectedUsers() {
    const result = await getCoreAPI(`/room/${global.room.id}/user`);

    if (result.connectedUser === null) {
        console.debug("VOICE : No user in room");
        return;
    }

    const connectedUser = result.connectedUser;

    const sortedByDisplayName = [...connectedUser].sort((a, b) => {
        return a.displayName.localeCompare(b.displayName);
    });

    const voiceContent = document.getElementById("voice-content");
    voiceContent.innerHTML = "";

    let tempList = [];

    for (const i in sortedByDisplayName) {
        tempList.push(sortedByDisplayName[i].id);
    }

    const usersPfpExist = await fileBulkExistMedia("/profiles/bulk", tempList);

    for (const i in sortedByDisplayName) {
        voiceContent.appendChild(voiceCreateUserHTML(sortedByDisplayName[i], usersPfpExist ? [sortedByDisplayName[i].id] : false));
    }

    // Room is currently active
    if (voice.activeRoom === global.room.id) {
        voiceUpdateJoinedUsers();
    }
}

// Create DOM Element / HTML for a give user
function voiceCreateUserHTML(userData, userPfpExist) {
    const DIV = document.createElement('div');
    DIV.id = `voice-${userData.id}`;
    DIV.className = "voice-profile";

    let profilePicture = "src/img/default-avatar.webp";
    if (userPfpExist === true) {
        profilePicture = `${global.url.media}/profiles/${userData.id}`;
    }

    DIV.innerHTML = `
        <div class='block-user'>
            <div class='relative'>
                <img src='${profilePicture}' alt='PFP' class='icon ring-2' />
            </div>
            <div class='user'>
                <h2 class='name'>${userData.displayName}</h2>
            </div>
        </div>
    `;

    return DIV;
}

// Add or remove controls on user in room
async function voiceUpdateJoinedUsers() {
    const result = await getCoreAPI(`/room/${global.room.id}/user`);

    if (result === null) {
        console.debug("VOICE : No user in room");
        return;
    }

    const connectedUser = result.connectedUser;

    for (const i in connectedUser) {
        const userId = connectedUser[i].id;

        // Not self
        if (global.user.id !== userId) {
            voiceUpdateUserControls(userId);
        }

        // No decoder
        if (voice.users[userId] === undefined) {
            await voiceCreateUserDecoder(userId);
        }
    }
}

async function voiceUpdateUserControls(userId) {
    const userDiv = document.getElementById(`voice-${userId}`);
    const readyState = voice.socket !== null ? voice.socket.readyState : WebSocket.CLOSED;

    switch (readyState) {
        case WebSocket.CLOSED:
            if (document.getElementById(`voice-controls-${userId}`) !== null) {
                document.getElementById(`voice-controls-${userId}`).remove();
            }
            break;

        case WebSocket.OPEN:
            if (document.getElementById(`voice-controls-${userId}`) !== null) {
                console.info('VOICE : There is already controls in this room');
                break;
            }

            // Add controls
            const INPUT_VOLUME = document.createElement('input');
            INPUT_VOLUME.type = "range";
            INPUT_VOLUME.className = "volume";
            INPUT_VOLUME.min = "0";
            INPUT_VOLUME.max = "1";
            INPUT_VOLUME.step = "0.05";
            INPUT_VOLUME.title = "100%";
            INPUT_VOLUME.oninput = () => voiceControlVolume(userId, INPUT_VOLUME);

            const BUTTON_MUTE = document.createElement('button');
            BUTTON_MUTE.className = "mute";
            BUTTON_MUTE.title = "Mute";
            BUTTON_MUTE.onclick = () => voiceControlMute(userId, BUTTON_MUTE);
            BUTTON_MUTE.innerHTML = SVG_MICROPHONE;

            const DIV_ACTION = document.createElement('div');
            DIV_ACTION.id = `voice-controls-${userId}`;
            DIV_ACTION.className = "block-action";
            DIV_ACTION.appendChild(INPUT_VOLUME);
            DIV_ACTION.appendChild(BUTTON_MUTE);

            userDiv.appendChild(DIV_ACTION);
            break;
    }
}

function voiceUpdateSelfControls() {
    const voiceAction = document.getElementById("voice-join-action");
    const readyState = (voice.socket !== null && voice.activeRoom === global.room.id) ? voice.socket.readyState : WebSocket.CLOSED;

    switch (readyState) {
        case WebSocket.CONNECTING:
            // Set disconnect actions
            voiceAction.className = "join";
            voiceAction.classList.add('waiting');
            voiceAction.title = "Waiting to join the room";
            voiceAction.innerHTML = SVG_PHONE_X;
            voiceAction.onclick = () => voiceLeave();
            break;

        case WebSocket.CLOSED:
            // Set connect actions
            voiceAction.className = "join";
            voiceAction.classList.add('disconnected');
            voiceAction.title = "Join the room";
            voiceAction.innerHTML = SVG_PHONE;
            voiceAction.onclick = () => voiceJoin(global.room.id);
            break;

        case WebSocket.OPEN:
            voiceAction.className = "join";
            voiceAction.classList.add('connected');
            voiceAction.title = "Leave the room";
            voiceAction.innerHTML = SVG_PHONE_X;
            voiceAction.onclick = () => voiceLeave();
            break;
    }
}

function voiceControlMute(userId, muteButton) {
    // Invert mute state
    voice.users[userId].muted = !voice.users[userId].muted;

    if (voice.users[userId].muted) {
        muteButton.classList.add('active');
    }
    else {
        muteButton.classList.remove('active');
    }
}

function voiceControlSelfMute() {
    const muteButton = document.getElementById("voice-self-mute");
    voice.selfMute = !voice.selfMute;

    if (voice.selfMute) {
        // Muted
        console.debug("VOICE : Self mute");
        muteButton.classList.add('active');
    }
    else {
        // Unmuted
        console.debug("VOICE : Self unmute");
        muteButton.classList.remove('active');
    }
}

/* Those don't do shit yet, only show it */

function voiceControlVolume(userId, volumeInput) {
    volumeInput.title = volume * 100 + "%";
}

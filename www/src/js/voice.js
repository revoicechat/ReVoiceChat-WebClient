const voice = {
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

// <user> call this function to start a call in a room
async function voiceJoin(roomId) {
    console.info(`VOICE : Initiate join on room: ${roomId}`);
    global.voice.roomId = roomId;

    try {
        // Init WebSocket
        voice.socket = new WebSocket(`${global.url.voice}/${roomId}?token=${global.jwtToken}`);
        voice.socket.binaryType = "arraybuffer";

        // Init send
        await voiceSendInit();
        await voiceUpdateUsersControls();

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
                voice.encoder.encode(audioData);
                audioData.close();

                // Update audioTimestamp (add 20ms / 20000µs)
                voice.audioTimestamp += 20000;
            }
        }

        console.info("VOICE : Room joined");
        document.getElementById(roomId).classList.add('active-voice');
        global.voice.roomId = roomId;
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

            // Decode and read audio
            const audioArrayBuffer = data.slice(headerEnd);
            const audioChunk = new EncodedAudioChunk({
                type: "key",
                timestamp: header.audioTimestamp,
                data: new Uint8Array(audioArrayBuffer),
            })

            const currentUser = voice.users[header.user];

            if (currentUser !== null) {
                voice.users[header.user].decoder.decode(audioChunk);
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

        global.voice.roomId = null;
        if (voice.socket !== null) {
            voice.socket.close();
        }
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

async function voiceCreateUserDecoder(userId) {
    const isSupported = await AudioDecoder.isConfigSupported(voiceCodecConfig);
    if (isSupported.supported) {
        voice.users[userId] = { decoder: null, playhead: 0 };

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

async function voiceLeave() {
    if (global.voice.roomId !== null) {
        const roomId = global.voice.roomId;
        console.info(`VOICE : Leaving voice chat ${roomId}`);
        document.getElementById(roomId).classList.remove('active-voice');
    }

    global.voice.roomId = null;

    if (voice.socket !== null) {
        voice.socket.close();
    }

    // Close all decoders
    for (const [key, user] of Object.entries(voice.users)) {
        if (user.decoder !== null) {
            await user.decoder.flush();
            await user.decoder.close();
        }
    };
    console.debug("VOICE : All users decoder flushed and closed");

    voiceUpdateSelfControls();
    voice.users = {};
}

async function voiceShowConnnectedUsers() {
    const result = await getCoreAPI(`/server/${global.server.id}/user`); // TO DO : Replace with actual Endpoint

    if (result === null) {
        console.debug("VOICE : No user in room");
        return;
    }

    const sortedByDisplayName = [...result].sort((a, b) => {
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
        voiceContent.appendChild(voiceCreateConnectedUser(sortedByDisplayName[i], usersPfpExist ? [sortedByDisplayName[i].id] : false));
    }

    // Room is currently active
    if (global.voice.roomId === global.room.id) {
        voiceUpdateUsersControls();
    }
}

/*  This function is called when a new user join the room
    It add the user in the interface, the users descriptor, and create a decoder
*/
async function voiceUserJoining(userData) {
    const voiceContent = document.getElementById("voice-content");
    const userPfpExist = await fileExistMedia(`/profiles/${userData.id}`);

    voiceContent.voiceCreateConnectedUser(userData, userPfpExist);
    await voiceCreateUserDecoder(userData.id);
}

/* This function is called when a user left the room */
async function voiceUserLeaving(userId) {
    const user = voice.users[userId];
    await user.decoder.flush();
    await user.decoder.close();
    voice.users[userId] = null;
}

function voiceCreateConnectedUser(userData, userPfpExist) {
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

async function voiceUpdateUsersControls() {
    const result = await getCoreAPI(`/server/${global.server.id}/user`); // TO DO : Replace with actual Endpoint

    if (result === null) {
        console.debug("VOICE : No user in room");
        return;
    }

    for (const i in result) {
        await voiceUpdateUser(result[i].id);
    }

    async function voiceUpdateUser(userId) {
        await voiceCreateUserDecoder(userId);
    }
}

function voiceUpdateSelfControls() {
    const voiceAction = document.getElementById("voice-join-action");
    const readyState = (voice.socket !== null && global.voice.roomId === global.room.id) ? voice.socket.readyState : WebSocket.CLOSED;

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

/* Those don't do shit yet, only show it */

function voiceControlVolume(userId, volumeInput) {
    volumeInput.title = volume * 100 + "%";
}

function voiceControlMute(userId, muteButton) {
    if (global.voice.users[userId].audio.muted) {
        muteButton.classList.remove('active');
    }
    else {
        muteButton.classList.add('active');
    }
}

function voiceControlSelfMute() {
    const mute = document.getElementById("voice-self-mute");

    if (global.voice.selfMute) {
        // Unmute
        console.debug("VOICE : Self unmute");
        global.voice.selfMute = false;
        mute.classList.remove('active');
    }
    else {
        // Mute
        console.debug("VOICE : Self mute");
        global.voice.selfMute = true;
        mute.classList.add('active');
    }
}
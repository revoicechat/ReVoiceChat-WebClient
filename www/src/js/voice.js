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
    audioCollector: null,
    selfMute: false,
    selfCompressor: false,
    gainNode: null,
    compressorNode: null,
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

// <user> call this to join a call in a room
async function voiceJoin(roomId) {
    console.info(`VOICE : Initiate join on room: ${roomId}`);
    voice.activeRoom = roomId;

    try {
        // Init WebSocket
        voice.socket = new WebSocket(`${global.url.voice}/${roomId}?token=${global.jwtToken}`);
        voice.socket.binaryType = "arraybuffer";

        // Setup encoder and transmitter
        await voiceEncodeAndTransmit();

        // Setup receiver and decoder
        voice.socket.onmessage = voiceReceiveAndDecode;

        // Update users in room
        await voiceUpdateJoinedUsers();

        // Update self
        voiceUpdateSelf();

        // Socket states
        voice.socket.onopen = () => console.debug('VOICE : WebSocket open');
        voice.socket.onclose = () => console.debug('VOICE : WebSocket closed');
        voice.socket.onerror = (e) => console.error('VOICE : WebSocket error:', e);

        console.info("VOICE : Room joined");

        let audio = new Audio('src/audio/userConnectedMale.mp3');
        audio.volume = 0.25;
        audio.play();
    }
    catch (error) {
        console.error(error);

        voice.activeRoom = null;
        if (voice.socket !== null) {
            voice.socket.close();
        }
    }
}

// <user> call this to leave a call in a room
async function voiceLeave() {
    if (voice.activeRoom !== null) {
        console.info(`VOICE : Leaving voice chat ${voice.activeRoom}`);
    }

    // Close WebSocket
    if (voice.socket !== null) {
        voice.socket.close();
    }

    // Flush and close all decoders
    for (const [, user] of Object.entries(voice.users)) {
        if (user.decoder !== null) {
            await user.decoder.flush();
            await user.decoder.close();
        }
    }
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

    voice.activeRoom = null;
    voiceUpdateSelf();
    voiceUpdateJoinedUsers();
    voice.users = {};

    let audio = new Audio('src/audio/userDisconnectedMale.mp3');
    audio.volume = 0.25;
    audio.play();
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

        let audio = new Audio('src/audio/userJoinMale.mp3');
        audio.volume = 0.25;
        audio.play();
    }
}

// <server.js> call this when a user leave the room
async function voiceUserLeaving(userId) {
    // Remove user from UI
    document.getElementById(`voice-${userId}`).remove();

    // User leaving is NOT self
    if (userId !== global.user.id && voice.socket !== null && voice.socket.readyState === WebSocket.OPEN) {
        const user = voice.users[userId];
        await user.decoder.flush();
        await user.decoder.close();
        voice.users[userId] = null;

        let audio = new Audio('src/audio/userLeftMale.mp3');
        audio.volume = 0.25;
        audio.play();
    }
}

// <voiceJoin> call this to setup encoder and transmiter of audio packet
async function voiceEncodeAndTransmit() {
    const supported = await AudioEncoder.isConfigSupported(voiceCodecConfig);
    if (!supported.supported) {
        throw new Error("Codec not supported (Encoder)");
    }

    // Setup Encoder
    voice.encoder = new AudioEncoder({
        output: encoderCallback,
        error: (error) => { throw Error(`Error during encoder setup:\n${error}\nCurrent codec :${voiceCodecConfig}`) },
    });

    voice.encoder.configure(voiceCodecConfig)

    // Init AudioContext
    voice.audioContext = new AudioContext({ sampleRate: voice.sampleRate });
    await voice.audioContext.audioWorklet.addModule('src/js/lib/voiceProcessor.js');

    // Init Mic capture
    const micSource = voice.audioContext.createMediaStreamSource(await navigator.mediaDevices.getUserMedia({ audio: true }));

    // Create Gain node
    voice.gainNode = voice.audioContext.createGain();

    // Create voice.compressorNode Node with default value (not connected by default)
    voice.compressorNode = voice.audioContext.createDynamicsCompressor();
    voice.compressorNode.threshold.setValueAtTime(-50, voice.audioContext.currentTime);
    voice.compressorNode.knee.setValueAtTime(40, voice.audioContext.currentTime);
    voice.compressorNode.ratio.setValueAtTime(12, voice.audioContext.currentTime);
    voice.compressorNode.attack.setValueAtTime(0, voice.audioContext.currentTime);
    voice.compressorNode.release.setValueAtTime(0.25, voice.audioContext.currentTime);

    // Set initial volume base on range
    voice.gainNode.gain.setValueAtTime(document.getElementById('voice-self-volume').value, voice.audioContext.currentTime)

    // Init AudioWorklet
    voice.audioCollector = new AudioWorkletNode(voice.audioContext, "AudioCollector");
    micSource.connect(voice.gainNode); // connect mic to gain
    voice.gainNode.connect(voice.audioCollector); // connect gain to audioCollector

    voice.audioCollector.port.onmessage = (event) => {
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

        const packet = packetEncode(header, audioChunkCopy);

        // Finally send it ! (but socket need to be open)
        if (voice.socket.readyState === WebSocket.OPEN) {
            voice.socket.send(packet);
        }
    }
}

// <voiceJoin> call this to setup reveicer and decoder of audio packet
function voiceReceiveAndDecode(packet) {
    const result = packetDecode(packet);
    const header = result.header;
    const data = result.data;

    if (voice.users[header.user]) {
        const currentUser = voice.users[header.user];
        // If user sending packet is muted, we stop
        if (currentUser.muted) {
            return;
        }

        // Decode and read audio
        const audioChunk = new EncodedAudioChunk({
            type: "key",
            timestamp: header.audioTimestamp * 1000,
            data: new Uint8Array(data),
        })

        if (currentUser.decoder !== null && currentUser.decoder.state === "configured") {
            currentUser.decoder.decode(audioChunk);
        }
    }
}

// Create an audio decoder for specified user
async function voiceCreateUserDecoder(userId) {
    console.debug("VOICE : Creating decoder for user:", userId);

    const isSupported = await AudioDecoder.isConfigSupported(voiceCodecConfig);
    if (isSupported.supported) {
        voice.users[userId] = { decoder: null, playhead: 0, muted: false, gainNode: null };

        voice.users[userId].decoder = new AudioDecoder({
            output: decoderCallback,
            error: (error) => { throw Error(`Error during decoder setup:\n${error}\nCurrent codec :${voiceCodecConfig}`) },
        });

        voice.users[userId].decoder.configure(voiceCodecConfig)
        voice.users[userId].playhead = 0;
        voice.users[userId].gainNode = voice.audioContext.createGain();
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

        source.connect(voice.users[userId].gainNode); // connect audio source to gain
        voice.users[userId].gainNode.connect(voice.audioContext.destination); // connect gain to output

        voice.users[userId].playhead = Math.max(voice.users[userId].playhead, voice.audioContext.currentTime) + buffer.duration;
        source.start(voice.users[userId].playhead);
        audioData.close();
    }
}

// Show users in a room
async function voiceShowJoinedUsers() {
    const result = await fetchCoreAPI(`/room/${global.room.id}/user`, 'GET');

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

    for (const user of sortedByDisplayName) {
        tempList.push(user.id);
    }

    const usersPfpExist = await fileBulkExistMedia("/profiles/bulk", tempList);

    for (const user of sortedByDisplayName) {
        voiceContent.appendChild(voiceCreateUserHTML(user, usersPfpExist ? [user.id] : false));
    }

    // Room is currently active
    if (voice.activeRoom === global.room.id) {
        voiceUpdateJoinedUsers();
    }
}

// Add or remove controls on users in room
async function voiceUpdateJoinedUsers() {
    const result = await fetchCoreAPI(`/room/${global.room.id}/user`, 'GET');

    if (result === null) {
        console.debug("VOICE : No user in room");
        return;
    }

    const connectedUser = result.connectedUser;

    for (const user of connectedUser) {
        const userId = user.id;

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

// Create DOM Element / HTML for a given user
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

// <voiceUpdateJoinedUsers> and <voiceUserJoining> call this to update control on given user
function voiceUpdateUserControls(userId) {
    const userDiv = document.getElementById(`voice-${userId}`);
    const readyState = voice.socket !== null ? voice.socket.readyState : WebSocket.CLOSED;

    switch (readyState) {
        case WebSocket.CLOSED: {
            if (document.getElementById(`voice-controls-${userId}`) !== null) {
                document.getElementById(`voice-controls-${userId}`).remove();
            }
            break;
        }
        case WebSocket.OPEN: {
            if (document.getElementById(`voice-controls-${userId}`) !== null) {
                console.info('VOICE : There is already controls in this room');
                break;
            }

            // Add controls
            const INPUT_VOLUME = document.createElement('input');
            INPUT_VOLUME.type = "range";
            INPUT_VOLUME.className = "volume";
            INPUT_VOLUME.min = "0";
            INPUT_VOLUME.max = "2";
            INPUT_VOLUME.value = "1";
            INPUT_VOLUME.step = "0.01";
            INPUT_VOLUME.title = "100%";
            INPUT_VOLUME.oninput = () => voiceControlUserVolume(userId, INPUT_VOLUME);

            const BUTTON_MUTE = document.createElement('button');
            BUTTON_MUTE.className = "mute";
            BUTTON_MUTE.title = "Mute";
            BUTTON_MUTE.onclick = () => voiceControlUserMute(userId, BUTTON_MUTE);
            BUTTON_MUTE.innerHTML = `<revoice-icon-microphone></revoice-icon-microphone>`;

            const DIV_ACTION = document.createElement('div');
            DIV_ACTION.id = `voice-controls-${userId}`;
            DIV_ACTION.className = "block-action";
            DIV_ACTION.appendChild(INPUT_VOLUME);
            DIV_ACTION.appendChild(BUTTON_MUTE);

            userDiv.appendChild(DIV_ACTION);
            break;
        }
    }
}

// Update user controls and UI
function voiceUpdateSelf() {
    const voiceAction = document.getElementById("voice-join-action");
    const readyState = (voice.socket !== null && voice.activeRoom === global.room.id) ? voice.socket.readyState : WebSocket.CLOSED;

    switch (readyState) {
        case WebSocket.CONNECTING:
            // Set disconnect actions
            voiceAction.className = "join";
            voiceAction.classList.add('waiting');
            voiceAction.title = "Waiting to join the room";
            voiceAction.innerHTML = `<revoice-icon-phone-x></revoice-icon-phone-x>`;
            voiceAction.onclick = () => voiceLeave();
            break;

        case WebSocket.CLOSED:
            // Set connect actions
            document.getElementById(global.room.id).classList.remove('active-voice');
            voiceAction.className = "join";
            voiceAction.classList.add('disconnected');
            voiceAction.title = "Join the room";
            voiceAction.innerHTML = `<revoice-icon-phone></revoice-icon-phone>`;
            voiceAction.onclick = () => voiceJoin(global.room.id);
            break;

        case WebSocket.OPEN:
            document.getElementById(voice.activeRoom).classList.add('active-voice');
            voiceAction.className = "join";
            voiceAction.classList.add('connected');
            voiceAction.title = "Leave the room";
            voiceAction.innerHTML = `<revoice-icon-phone-x></revoice-icon-phone-x>`;
            voiceAction.onclick = () => voiceLeave();
            break;
    }
}

// <user> call this to mute other user
function voiceControlUserMute(userId, muteButton) {
    // Invert mute state
    voice.users[userId].muted = !voice.users[userId].muted;

    if (voice.users[userId].muted) {
        muteButton.classList.add('active');
    }
    else {
        muteButton.classList.remove('active');
    }
}

// <user> call this to change volume of other user
function voiceControlUserVolume(userId, volumeInput) {
    const volume = volumeInput.value;
    volumeInput.title = volume * 100 + "%";

    const userGainNode = voice.users[userId].gainNode;
    if (userGainNode) {
        userGainNode.gain.setValueAtTime(volume, voice.audioContext.currentTime);
    }
}

// <user> call this to mute himself
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

// <user> call this to change his volume
function voiceControlSelfVolume(volume) {
    document.getElementById('voice-self-volume').title = parseInt(volume * 100) + "%";
    if (voice.gainNode) {
        voice.gainNode.gain.setValueAtTime(volume, voice.audioContext.currentTime);
    }
}

function voiceControlSelfCompressor() {
    voice.selfCompressor = !voice.selfCompressor;
    if (voice.selfCompressor) {
        document.getElementById('voice-self-compressor').classList.add('active');
        if (voice.gainNode && voice.compressorNode) {
            voice.gainNode.disconnect(voice.audioCollector);
            voice.gainNode.connect(voice.compressorNode);
            voice.compressorNode.connect(voice.audioCollector);
        }
    } else {
        document.getElementById('voice-self-compressor').classList.remove('active');
        if (voice.gainNode && voice.compressorNode) {
            voice.gainNode.disonnect(voice.compressorNode);
            voice.compressorNode.disconnect(voice.audioCollector);
            voice.gainNode.connect(voice.audioCollector);
        }
    }
}

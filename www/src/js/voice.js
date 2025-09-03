const voice = {
    encoder: null,
    socket: null,
    buffer: [],
    bufferMaxLength: 960, // 48,000 samples / sec × 0.020 sec = 960 samples
    sampleRate: 48000,
    bitrate: 64000,
    frameDuration: 20000,
    audioTimestamp: 0
}

const opusConfig = {
    application: "voip",
    complexity: 9,
    signal: "voice",
    usedtx: true,
    frameDuration: voice.frameDuration, //20ms
    useinbanddec: true,
};

const codecConfig = {
    codec: "opus",
    sampleRate: voice.sampleRate,
    numberOfChannels: 1,
    bitrate: voice.bitrate,
    bitrateMode: "variable",
    opus: opusConfig,
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

        // Init AudioContext
        const audioContext = new AudioContext({ sampleRate: voice.sampleRate });
        await audioContext.audioWorklet.addModule('src/js/voicePcmCollector.js');

        // Init Mic capture
        const micSource = audioContext.createMediaStreamSource(await navigator.mediaDevices.getUserMedia({ audio: true }));

        // Init AudioWorklet
        const workletNode = new AudioWorkletNode(audioContext, "PcmCollector");
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

        global.voice.roomId = roomId;
        console.info("VOICE : Room joined");

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
    const supported = await AudioEncoder.isConfigSupported(codecConfig);
    if (supported.supported) {
        // Setup Encoder
        voice.encoder = new AudioEncoder({
            output: encoderCallback,
            error: (error) => { throw Error(`Error during codec setup:\n${error}\nCurrent codec :${codecConfig}`) },
        });

        voice.encoder.configure(codecConfig)
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

function voiceLeave(roomId) {

}

async function voiceShowConnnectedUsers(roomId) {
    const result = await getCoreAPI(`/server/${global.server.id}/user`); // TO DO : Replace with actual Endpoint

    if (result === null) {
        console.info("VOICE : No user in room");
        return;
    }

    const sortedByDisplayName = [...result].sort((a, b) => {
        return a.displayName.localeCompare(b.displayName);
    });

    const VOICE_CONTENT = document.getElementById("voice-content");
    VOICE_CONTENT.innerHTML = "";

    let tempList = [];

    for (const i in sortedByDisplayName) {
        tempList.push(sortedByDisplayName[i].id);
    }

    const usersPfpExist = await fileBulkExistMedia("/profiles/bulk", tempList);

    for (const i in sortedByDisplayName) {
        VOICE_CONTENT.appendChild(voiceCreateConnectedUser(sortedByDisplayName[i], usersPfpExist ? [sortedByDisplayName[i].id] : false));
    }

    // Room is currently active
    if (global.voice.roomId === global.room.id) {
        voiceUpdateUsersControls();
    }
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
        console.info("VOICE : No user in room");
        return;
    }

    for (const i in result) {
        voiceUpdateUser(result[i].id);
    }
}

function voiceUpdateUser(userId) {

}

function voiceUpdateSelfControls() {
    const VOICE_ACTION = document.getElementById("voice-join-action");
    const readyState = (global.voice.socket !== null && global.voice.roomId === global.room.id) ? global.voice.socket.readyState : WebSocket.CLOSED;

    switch (readyState) {
        case WebSocket.CONNECTING:
            // Set disconnect actions
            VOICE_ACTION.className = "join";
            VOICE_ACTION.classList.add('waiting');
            VOICE_ACTION.innerText = "Leave";
            VOICE_ACTION.onclick = () => voiceLeave();
            break;

        case WebSocket.CLOSED:
            // Set connect actions
            VOICE_ACTION.className = "join";
            VOICE_ACTION.classList.add('disconnected');
            VOICE_ACTION.innerText = "Join";
            VOICE_ACTION.onclick = () => voiceJoin(global.room.id);
            break;

        case WebSocket.OPEN:
            VOICE_ACTION.className = "join";
            VOICE_ACTION.classList.add('connected');
            VOICE_ACTION.innerText = "Leave";
            VOICE_ACTION.onclick = () => voiceLeave();
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
        console.info("VOICE : Self unmute");
        global.voice.selfMute = false;
        mute.classList.remove('active');
    }
    else {
        // Mute
        console.info("VOICE : Self mute");
        global.voice.selfMute = true;
        mute.classList.add('active');
    }
}
let mediaRecorder = null;
let userBuffer = [];

function voiceJoin(roomId) {
    console.info(`VOICE : Joining voice chat ${roomId}`);
    document.getElementById(roomId).classList.add('active-voice');
    current.voice.activeRoom = roomId;
    voiceUpdateControls();

    current.voice.socket = new WebSocket(`${current.url.voice}`);
    current.voice.socket.binaryType = "arraybuffer";

    current.voice.socket.onopen = () => {
        console.info("VOICE : WebSocket opened");
        voiceUpdateControls();
        voiceSendAudio();
    };

    current.voice.socket.onmessage = (event) => {
        voiceReceiveAudio(event.data);
    }

    current.voice.socket.onclose = () => {
        console.info("VOICE : WebSocket closed");
        voiceUpdateControls();
    }
}

function voiceLeave() {
    if (current.voice.activeRoom !== null) {
        const roomId = current.voice.activeRoom;
        console.info(`VOICE : Leaving voice chat ${roomId}`);
        document.getElementById(roomId).classList.remove('active-voice');
    }

    current.voice.activeRoom = null;
    if (current.voice.socket !== null) {
        current.voice.socket.close();
        console.log("VOICE : Socket closed");
    }

    if (mediaRecorder !== null) {
        mediaRecorder.stop();
        console.log("VOICE : mediaRecorder stopped");
    }

    voiceUpdateControls();
}

function voiceSendAudio() {
    // Get microphone access
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {
            // Set MIME type — must be supported by browser and receiver
            const mimeType = "audio/webm; codecs=opus";
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                console.error("MIME type not supported");
                return;
            }

            mediaRecorder = new MediaRecorder(stream, { mimeType });

            mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0 && current.voice.socket.readyState === WebSocket.OPEN) {
                    // Audio buffer
                    const audioBuffer = await event.data.arrayBuffer();

                    // Header (roomId, userId, timestamp)
                    const header = JSON.stringify({ roomId: current.voice.activeRoom, userId: current.user.id, timestamp: Date.now() });
                    const headerBytes = new TextEncoder().encode(header);
                    const totalLength = 2 + headerBytes.length + audioBuffer.byteLength;
                    const combined = new Uint8Array(totalLength);

                    // Frame / view
                    const view = new DataView(combined.buffer);
                    view.setUint16(0, headerBytes.length);
                    combined.set(headerBytes, 2);
                    combined.set(new Uint8Array(audioBuffer), 2 + headerBytes.length);

                    current.voice.socket.send(combined);
                }
            };

            mediaRecorder.start(100);
        })
        .catch((error) => {
            console.error('Error capturing audio.', error);
        });
}

function voiceReceiveAudio(data) {
    const view = new DataView(data);

    // Read and decode 2 bytes header
    const headerLength = view.getUint16(0);
    const headerStart = 2;
    const headerEnd = headerStart + headerLength;
    const headerBytes = new Uint8Array(data.slice(headerStart, headerEnd));
    const headerJSON = new TextDecoder().decode(headerBytes);
    const header = JSON.parse(headerJSON);

    // Read audio
    const audioBytes = data.slice(headerEnd);

    // Only listen to your active room stream
    if (header.roomId === current.voice.activeRoom) {
        const chunk = new Uint8Array(audioBytes);

        const tryAppend = () => {
            if (!userBuffer[header.userId].sourceBuffer.updating) {
                userBuffer[header.userId].sourceBuffer.appendBuffer(chunk);
            } else {
                userBuffer[header.userId].sourceBuffer.addEventListener('updateend', tryAppend, { once: true });
            }
        };

        tryAppend();
    }
}

function voiceUpdateControls() {
    const VOICE_ACTION = document.getElementById("voice-join-action");
    const readyState = current.voice.socket !== null ? current.voice.socket.readyState : WebSocket.CLOSED;

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
            VOICE_ACTION.onclick = () => voiceJoin(current.room.id);
            break;

        case WebSocket.OPEN:
            VOICE_ACTION.className = "join";
            VOICE_ACTION.classList.add('connected');
            VOICE_ACTION.innerText = "Leave";
            VOICE_ACTION.onclick = () => voiceLeave();
            break;
    }
}

function voiceCreateUser(userData, userPfpExist) {
    const DIV = document.createElement('div');
    DIV.id = userData.id;
    DIV.className = "voice-profile";

    let profilePicture = "src/img/default-avatar.webp";
    if (userPfpExist === true) {
        profilePicture = `${current.url.media}/profiles/${userData.id}`;
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

    // Action block
    const INPUT_VOLUME = document.createElement('input');
    INPUT_VOLUME.id = `volume-${userData.id}`;
    INPUT_VOLUME.type = "range";
    INPUT_VOLUME.className = "volume";
    INPUT_VOLUME.min = "0";
    INPUT_VOLUME.max = "1";
    INPUT_VOLUME.step = "0.05";
    INPUT_VOLUME.title = "100%";
    INPUT_VOLUME.oninput = () => voiceControlVolume(userData.id, INPUT_VOLUME.value);

    const BUTTON_MUTE = document.createElement('button');
    BUTTON_MUTE.id = `mute-${userData.id}`;
    BUTTON_MUTE.className = "mute";
    BUTTON_MUTE.title = "Mute";
    BUTTON_MUTE.onclick = () => voiceControlMute(userData.id);
    BUTTON_MUTE.innerHTML = SVG_MICROPHONE;

    const DIV_ACTION = document.createElement('div');
    DIV_ACTION.className = "block-action";
    DIV_ACTION.appendChild(INPUT_VOLUME);
    DIV_ACTION.appendChild(BUTTON_MUTE);
    DIV.appendChild(DIV_ACTION);

    // Create audio element for user
    const AUDIO = document.createElement("audio");
    AUDIO.id = `audio-${userData.id}`;
    AUDIO.controls = false;
    DIV.appendChild(AUDIO);

    // Create user MediaSource
    userBuffer[userData.id] = { mediaSource: null, sourceBuffer: null, queue: [] };

    userBuffer[userData.id].mediaSource = new MediaSource();

    userBuffer[userData.id].mediaSource.onsourceopen = () => {
        userBuffer[userData.id].sourceBuffer = userBuffer[userData.id].mediaSource.addSourceBuffer('audio/webm; codecs="opus"');

        userBuffer[userData.id].sourceBuffer.addEventListener('updateend', () => {
            if (userBuffer[userData.id].queue.length > 0 && !userBuffer[userData.id].sourceBuffer.updating) {
                userBuffer[userData.id].sourceBuffer.appendBuffer(userBuffer[userData.id].queue.shift());
            }
        });

        AUDIO.play().catch(function (error) {
            if (error.name == "NotSupportedError") {
                console.log("Stopping playback. No audio was received")
            }
        });
    };

    AUDIO.src = URL.createObjectURL(userBuffer[userData.id].mediaSource);

    return DIV;
}

async function voiceJoinedUsers() {
    const result = await getCoreAPI(`/server/${current.server.id}/user`);

    if (result !== null) {
        const sortedByDisplayName = [...result].sort((a, b) => {
            return a.displayName.localeCompare(b.displayName);
        });

        const VOICE_CONTENT = document.getElementById("voice-content");
        VOICE_CONTENT.innerHTML = "";

        let tempList = [];

        for (const neddle in sortedByDisplayName) {
            tempList.push(sortedByDisplayName[neddle].id);
        }

        const usersPfpExist = await fileBulkExistMedia("/profiles/bulk", tempList);

        for (const neddle in sortedByDisplayName) {
            VOICE_CONTENT.appendChild(await voiceCreateUser(sortedByDisplayName[neddle], usersPfpExist ? [sortedByDisplayName[neddle].id] : false));
        }
    }
}

function voiceControlVolume(userId, volume) {
    document.getElementById(`audio-${userId}`).volume = volume;
    document.getElementById(`volume-${userId}`).title = volume * 100 + "%";
}

function voiceControlMute(userId) {
    const audio = document.getElementById(`audio-${userId}`);
    const muteButton = document.getElementById(`mute-${userId}`);
    if (audio.muted) {
        audio.muted = false;
        muteButton.classList.remove('active');
    }
    else {
        audio.muted = true;
        muteButton.classList.add('active');
    }
}

function voiceControlSelfMute() {
    const mute = document.getElementById("voice-self-mute");

    if (mediaRecorder !== null) {
        if (current.voice.selfMute) {
            // Unmute
            console.info("VOICE : Self unmute");
            current.voice.selfMute = false;
            mute.classList.remove('active');
            mediaRecorder.resume();
        }
        else {
            // Mute
            console.info("VOICE : Self mute");
            current.voice.selfMute = true;
            mute.classList.add('active');
            mediaRecorder.pause();
        }
    }
}

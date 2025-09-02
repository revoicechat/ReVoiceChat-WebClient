const mediaCodec = 'audio/webm; codecs="opus"';
let mediaRecorder = null;

function voiceJoin(roomId) {
    if (current.voice.roomId !== null) {
        console.info(`VOICE : Already connected in room ${current.voice.roomId}`);
        voiceLeave();
    }

    console.info(`VOICE : Joining voice chat ${roomId}`);

    document.getElementById(roomId).classList.add('active-voice');
    current.voice.roomId = roomId;
    voiceUpdateSelfControls();

    current.voice.socket = new WebSocket(`${current.url.voice}`);
    current.voice.socket.binaryType = "arraybuffer";

    current.voice.socket.onopen = () => {
        console.info("VOICE : WebSocket opened");
        voiceUpdateSelfControls();
        voiceUpdateUsersControls();
        voiceJoinedUsersSources();
        voiceSendAudio();
    };

    current.voice.socket.onmessage = (event) => {
        voiceReceiveAudio(event.data);
    }

    current.voice.socket.onclose = () => {
        console.info("VOICE : WebSocket closed");
        voiceUpdateSelfControls();
        voiceUpdateUsersControls();
        current.voice.users = [];
    }
}

function voiceLeave() {
    if (current.voice.roomId !== null) {
        const roomId = current.voice.roomId;
        console.info(`VOICE : Leaving voice chat ${roomId}`);
        document.getElementById(roomId).classList.remove('active-voice');
    }

    current.voice.roomId = null;
    if (current.voice.socket !== null) {
        current.voice.socket.close();
        console.info("VOICE : Socket closed");
    }

    if (mediaRecorder !== null) {
        mediaRecorder.stop();
        console.info("VOICE : mediaRecorder stopped");
    }

    voiceUpdateSelfControls();
    voiceUpdateUsersControls();
    current.voice.users = [];
}

function voiceSendAudio() {
    // Get microphone access
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {
            // MIME type must be supported by browser and receiver
            if (!MediaRecorder.isTypeSupported(mediaCodec)) {
                console.error("MIME type not supported");
                return;
            }

            mediaRecorder = new MediaRecorder(stream, { mediaCodec });

            mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0 && current.voice.socket.readyState === WebSocket.OPEN) {
                    // Audio buffer
                    const audioBuffer = await event.data.arrayBuffer();

                    // Header (roomId, userId, timestamp)
                    const header = JSON.stringify({ roomId: current.voice.roomId, userId: current.user.id, timestamp: Date.now() });
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
    if (header.roomId === current.voice.roomId) {
        const audioChunk = new Uint8Array(audioBytes);

        if (current.voice.users[header.userId].buffer.updating || current.voice.users[header.userId].queue.length > 0) {
            current.voice.users[header.userId].queue.push(audioChunk);
        }
        else {
            current.voice.users[header.userId].buffer.appendBuffer(audioChunk);
        }
    }
}

async function voiceJoinedUsersSources() {
    const result = await getCoreAPI(`/server/${current.server.id}/user`); // TO DO : Replace with actual Endpoint

    if (result === null) {
        console.info("VOICE : No user in room");
        return;
    }

    for (const i in result) {
        voiceCreateUserSource(result[i].id);
    }
}

function voiceCreateUserSource(userId) {
    // Create user structure
    if (current.voice.users[userId] === null || current.voice.users[userId] === undefined) {
        current.voice.users[userId] = { mediaSource: null, buffer: null, queue: [], audio: null };
    }

    // Create Audio
    current.voice.users[userId].audio = new Audio();

    // Create MediaSource
    current.voice.users[userId].mediaSource = new MediaSource();
    current.voice.users[userId].audio.src = URL.createObjectURL(current.voice.users[userId].mediaSource);

    current.voice.users[userId].mediaSource.onsourceopen = () => {
        current.voice.users[userId].buffer = current.voice.users[userId].mediaSource.addSourceBuffer(mediaCodec);

        current.voice.users[userId].buffer.addEventListener('update', function () {
            if (current.voice.users[userId].queue.length > 0 && !current.voice.users[userId].buffer.updating) {
                current.voice.users[userId].buffer.appendBuffer(current.voice.users[userId].queue.shift());
            }
        });

        current.voice.users[userId].audio.play();
    };
}

/* Functions for UI */
async function voiceJoinedUsers() {
    const result = await getCoreAPI(`/server/${current.server.id}/user`); // TO DO : Replace with actual Endpoint

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
        VOICE_CONTENT.appendChild(voiceCreateJoinedUser(sortedByDisplayName[i], usersPfpExist ? [sortedByDisplayName[i].id] : false));
    }

    // Room is currently active
    if (current.voice.roomId === current.room.id) {
        voiceUpdateUsersControls();
    }
}

function voiceCreateJoinedUser(userData, userPfpExist) {
    const DIV = document.createElement('div');
    DIV.id = `voice-${userData.id}`;
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

    return DIV;
}

/* Functions for User controls  */

function voiceUpdateSelfControls() {
    const VOICE_ACTION = document.getElementById("voice-join-action");
    const readyState = (current.voice.socket !== null && current.voice.roomId === current.room.id) ? current.voice.socket.readyState : WebSocket.CLOSED;

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

async function voiceUpdateUsersControls() {
    const result = await getCoreAPI(`/server/${current.server.id}/user`); // TO DO : Replace with actual Endpoint

    if (result === null) {
        console.info("VOICE : No user in room");
        return;
    }

    for (const i in result) {
        voiceUpdateUser(result[i].id);
    }
}

function voiceUpdateUser(userId) {
    const userDiv = document.getElementById(`voice-${userId}`);
    const readyState = current.voice.socket !== null ? current.voice.socket.readyState : WebSocket.CLOSED;

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

function voiceControlVolume(userId, volumeInput) {
    current.voice.users[userId].audio.volume = volumeInput.value;
    volumeInput.title = volume * 100 + "%";
}

function voiceControlMute(userId, muteButton) {
    if (current.voice.users[userId].audio.muted) {
        current.voice.users[userId].audio.muted = false;
        muteButton.classList.remove('active');
    }
    else {
        current.voice.users[userId].audio.muted = true;
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

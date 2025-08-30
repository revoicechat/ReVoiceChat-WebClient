let mediaRecorder = null;

function voiceConnect() {
    current.voice.socket = io(current.url.voiceServer, {
        transports: ['websocket'],
        upgrade: false
    });

    current.voice.socket.on('connect', () => {
        current.voice.socketStatus = "connected";
        updateVoiceControl();

        current.voice.socket.emit("clientConnect", {
            userId: current.user.id,
            roomId: current.voice.activeRoom,
        });

        // Send Audio
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then((stream) => {
                mediaRecorder = new MediaRecorder(stream);
                let audioChunks = [];

                // Add audio chunk to buffer
                mediaRecorder.addEventListener("dataavailable", function (event) {
                    audioChunks.push(event.data);
                });

                // Send audio chunk when media stopped
                mediaRecorder.addEventListener("stop", function () {
                    let audioBlob = new Blob(audioChunks);
                    audioChunks = [];
                    let fileReader = new FileReader();
                    fileReader.readAsDataURL(audioBlob);
                    fileReader.onloadend = function () {
                        const roomData = {
                            audioData: fileReader.result,
                            roomId: current.voice.activeRoom,
                            userId: current.user.id
                        }
                        current.voice.socket.emit("roomStream", roomData);
                    };

                    // Make audio chunk
                    mediaRecorder.start();
                    setTimeout(function () {
                        mediaRecorder.stop();
                    }, current.voice.delay);
                });

                // Start buffering
                mediaRecorder.start();

                // Stop buffering
                setTimeout(function () {
                    mediaRecorder.stop();
                }, current.voice.delay);
            })
            .catch((error) => {
                console.error('Error capturing audio.', error);
            });
    });

    current.voice.socket.on('disconnect', () => {
        current.voice.socketStatus = "disconnected";
        console.log("VOICE : Socket disconnected");
    });

    // Only listen to your active room stream
    current.voice.socket.on(current.voice.activeRoom, (roomData) => {
        //console.log(`Data from user ${roomData.userId}`);

        let newData = roomData.audioData.split(";");
        newData[0] = "data:audio/ogg;";
        newData = newData[0] + newData[1];

        let audio = new Audio(newData);
        if (!audio || document.hidden) {
            return;
        }
        audio.play();
    });
}

function voiceDisconnect() {
    if (current.voice.socket !== null) {
        current.voice.socket.close();
        console.log("VOICE : Socket closed");
    }

    if (mediaRecorder !== null) {
        mediaRecorder.stop();
        console.log("VOICE : mediaRecorder stopped");
    }
}

async function startVoiceCall(roomId) {
    console.info(`VOICE : Joining voice chat ${roomId}`);

    document.getElementById(roomId).classList.add('active-voice');

    current.voice.activeRoom = roomId;
    current.voice.socketStatus = "waiting";

    voiceConnect();
    updateVoiceControl();
};

async function stopVoiceCall() {
    if (current.voice.activeRoom !== null) {
        const roomId = current.voice.activeRoom;
        console.info(`VOICE : Leaving voice chat ${roomId}`);
        document.getElementById(roomId).classList.remove('active-voice');
    }

    current.voice.activeRoom = null;
    current.voice.socketStatus = "disconnected";

    voiceDisconnect()
    updateVoiceControl();
}

function updateVoiceControl() {
    const VOICE_ACTION = document.getElementById("voice-control-action");

    switch (current.voice.socketStatus) {
        case "waiting":
            // Set disconnect actions
            VOICE_ACTION.className = "";
            VOICE_ACTION.classList.add('waiting');
            VOICE_ACTION.innerText = "Wait";
            VOICE_ACTION.onclick = () => stopVoiceCall();
            break;

        case "disconnected":
            // Set connect actions
            VOICE_ACTION.className = "";
            VOICE_ACTION.classList.add('disconnected');
            VOICE_ACTION.innerText = "Join";
            VOICE_ACTION.onclick = () => startVoiceCall(current.room.id);
            break;

        case "connected":
            VOICE_ACTION.className = "";
            VOICE_ACTION.classList.add('connected');
            VOICE_ACTION.innerText = "Leave";
            VOICE_ACTION.onclick = () => stopVoiceCall();
            break;
    }
}

function voiceCreateUser(data, userPfpExist) {
    /*const DIV_CONTENT = document.createElement('div');
    DIV_CONTENT.className = "voice-profile";
    DIV_CONTENT.id = userData.id;
    DIV_CONTENT.innerHTML = `<div class='user'>${userData.displayName}</div>`;
    return DIV_CONTENT;*/

    const DIV = document.createElement('div');
    DIV.id = data.id;
    DIV.className = "voice-profile";

    let profilePicture = "src/img/default-avatar.webp";
    if (userPfpExist) {
        profilePicture = `${current.url.media}/profiles/${data.id}`;
    }

    DIV.innerHTML = `
        <div class='block-user'>
            <div class='relative'>
                <img src='${profilePicture}' alt='PFP' class='icon ring-2' />
            </div>
            <div class='user'>
                <h2 class='name'>${data.displayName}</h2>
            </div>
        </div>
        <div class='block-action'>
            <input class='volume' type='range' min='0' max='1' step='0.05' value='1' title='100%' id='volume-${data.id}'>
            <button class='mute' id='mute-${data.id}' title='Mute'>${SVG_MICROPHONE}</button>
        </div>
    `;

    return DIV;
}

async function voiceJoinedUsers() {
    const result = await getCoreAPI(`/server/${current.server.id}/user`);

    if (result !== null) {
        const sortedByDisplayName = [...result].sort((a, b) => {
            return a.displayName.localeCompare(b.displayName);
        });

        const sortedByStatus = [...sortedByDisplayName].sort((a, b) => {
            if (a.status === b.status) {
                return 0;
            }
            else {
                if (a.status === "OFFLINE") {
                    return 1;
                }
                if (b.status === "OFFLINE") {
                    return -1;
                }
            }
        });

        const VOICE_CONTENT = document.getElementById("voice-content");
        VOICE_CONTENT.innerHTML = "";

        let tempList = [];

        for (const neddle in sortedByStatus) {
            tempList.push(sortedByStatus[neddle].id);
        }

        const usersPfpExist = await fileBulkExistMedia("/profiles/bulk", tempList);

        for (const neddle in sortedByStatus) {
            VOICE_CONTENT.appendChild(await voiceCreateUser(sortedByStatus[neddle], usersPfpExist ? [sortedByStatus[neddle].id] : false));
        }
    }
}
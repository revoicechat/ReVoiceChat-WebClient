let mediaRecorder = null;

function voiceConnect() {
    current.voice.socket = io(current.url.voiceServer, {
        transports: ['websocket'],
        upgrade: false
    });

    current.voice.socket.on('connect', () => {
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
        console.log("VOICE : Socket disconnected");
    });

    // Only listen to your active room stream
    current.voice.socket.on(current.voice.activeRoom, (roomData) => {
        console.log(`Data from user ${roomData.userId}`);

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
    voiceDisconnect()
    updateVoiceControl();
}

function updateVoiceControl() {
    const VOICE_ACTION = document.getElementById("voice-control-action");

    if (current.voice.activeRoom === null) {
        // Set connect actions
        VOICE_ACTION.classList.add('connect');
        VOICE_ACTION.classList.remove('disconnect');
        VOICE_ACTION.innerText = "Connect";
        VOICE_ACTION.onclick = () => startVoiceCall(current.room.id);
    }
    else {
        // Set disconnect actions
        VOICE_ACTION.classList.remove('connect');
        VOICE_ACTION.classList.add('disconnect');
        VOICE_ACTION.innerText = "Disconnect";
        VOICE_ACTION.onclick = () => stopVoiceCall();
    }
}
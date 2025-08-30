let socket = null;

function voiceConnect() {
    socket = io("https://core.dev.revoicechat.fr/voice", {
        transports: ['websocket'],
        upgrade: false
    });

    socket.on('connect', () => {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then((stream) => {
                var madiaRecorder = new MediaRecorder(stream);
                var audioChunks = [];

                madiaRecorder.addEventListener("dataavailable", function (event) {
                    audioChunks.push(event.data);
                });

                madiaRecorder.addEventListener("stop", function () {
                    var audioBlob = new Blob(audioChunks);
                    audioChunks = [];
                    var fileReader = new FileReader();
                    fileReader.readAsDataURL(audioBlob);
                    fileReader.onloadend = function () {
                        var base64String = fileReader.result;
                        socket.emit("audioStream", base64String);
                    };

                    madiaRecorder.start();
                    setTimeout(function () {
                        madiaRecorder.stop();
                    }, 1000);
                });

                madiaRecorder.start();
                setTimeout(function () {
                    madiaRecorder.stop();
                }, 1000);
            })
            .catch((error) => {
                console.error('Error capturing audio.', error);
            });
    });

    socket.on('audioStream', (audioData) => {
        var newData = audioData.split(";");
        newData[0] = "data:audio/ogg;";
        newData = newData[0] + newData[1];

        var audio = new Audio(newData);
        if (!audio || document.hidden) {
            return;
        }
        audio.play();
    });
}


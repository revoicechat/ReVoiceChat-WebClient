async function initWebRTC() {
    console.info("WEBRTC : Initializing");

    current.webrtc.socket = new WebSocket(current.url.voiceSignal);
    current.webrtc.p2p = new RTCPeerConnection({
        iceServers: [
            stun = {
                urls: "stun:stundev.revoicechat.fr"
            },
            turn =
            {
                urls: 'turn:stundev.revoicechat.fr',
                credential: 'userdev',
                username: 'passdev'
            }

        ]
    });

    // Handle remote audio from other peer
    current.webrtc.p2p.ontrack = event => {
        const remoteAudio = document.getElementById("remoteAudio");
        const audio = document.createElement("audio");
        audio.autoplay = true;
        audio.muted = false;
        audio.controls = true;
        audio.srcObject = event.streams[0];
        remoteAudio.appendChild(audio);
    };

    // Send ICE candidates to peer
    current.webrtc.p2p.onicecandidate = event => {
        if (event.candidate) {
            current.webrtc.socket.send(JSON.stringify({ candidate: event.candidate }));
        }
    };

    // Handle signaling messages
    current.webrtc.socket.onmessage = async (msg) => {
        const data = JSON.parse(msg.data)

        console.log(data);

        if (true || data.room === current.webrtc.activeRoom) {
            if (data.offer) {

                await current.webrtc.p2p.setRemoteDescription(new RTCSessionDescription(data.offer));

                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                // Add mic to peer connection
                stream.getTracks().forEach(track => current.webrtc.p2p.addTrack(track, stream));

                const answer = await current.webrtc.p2p.createAnswer();
                await current.webrtc.p2p.setLocalDescription(answer);
                current.webrtc.socket.send(JSON.stringify({ answer: answer }));

            }

            if (data.answer) {
                await current.webrtc.p2p.setRemoteDescription(new RTCSessionDescription(data.answer));
            }

            if (data.candidate) {
                try {
                    await current.webrtc.p2p.addIceCandidate(data.candidate);
                } catch (e) {
                    console.error("Error adding ICE candidate", e);
                }
            }
        }
    };

    // TO DO : A real promise ?
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve("resolved");
        }, 200);
    });
}

// Start call (send offer)
async function startCall(roomId) {
    // Now clicking on button stop the call (first so you can clear old objects)
    document.getElementById(roomId).onclick = () => stopCall(roomId);

    await initWebRTC();

    console.info(`WEBRTC : Joining voice chat ${roomId}`);

    document.getElementById(roomId).classList.add('active-voice');
    current.webrtc.activeRoom = roomId;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => current.webrtc.p2p.addTrack(track, stream));

    const offer = await current.webrtc.p2p.createOffer();
    await current.webrtc.p2p.setLocalDescription(offer);
    current.webrtc.socket.send(JSON.stringify({ offer: offer, room: roomId }));
};

async function stopCall(roomId) {
    console.info(`WEBRTC : Leaving voice chat ${roomId}`);

    document.getElementById(roomId).classList.remove('active-voice');

    // Closing active connection
    current.webrtc.socket.close();
    current.webrtc.p2p.close();

    // Clearing variables
    current.webrtc.socket = null;
    current.webrtc.p2p = null;
    current.webrtc.activeRoom = null;

    // Clearing DOM
    document.getElementById("remoteAudio").innerHTML = "";

    // Now clicking on button start the call
    document.getElementById(roomId).onclick = () => startCall(roomId);
}
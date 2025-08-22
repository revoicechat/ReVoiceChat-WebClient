function initWebRTC() {
    console.log("Initializing WebRTC ...");

    current.webrtc.socket = new WebSocket(current.url.voiceSignal);
    current.webrtc.p2p = new RTCPeerConnection({
        iceServers: [{ urls: `stun:${current.url.voiceStun}` }]
    });

    const remoteAudio = document.getElementById("remoteAudio");

    // Handle remote audio from other peer
    current.webrtc.p2p.ontrack = event => {
        remoteAudio.srcObject = event.streams[0];
    };

    // Send ICE candidates to peer
    current.webrtc.p2p.onicecandidate = event => {
        if (event.candidate) {
            current.webrtc.socket.send(JSON.stringify({ candidate: event.candidate }));
        }
    };

    // Handle signaling messages
    current.webrtc.socket.onmessage = async (msg) => {
        const data = JSON.parse(msg.data);

        console.log(data);

        if (data.offer) {
            await current.webrtc.p2p.setRemoteDescription(new RTCSessionDescription(data.offer));

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Add mic to peer connection
            stream.getTracks().forEach(track => current.webrtc.p2p.addTrack(track, stream));

            // --- Self-monitoring audio ---
            const localAudio = document.createElement("audio");
            localAudio.autoplay = true;
            localAudio.muted = false; // allow hearing yourself
            localAudio.srcObject = stream;
            document.body.appendChild(localAudio); // optional

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
    };
}

// Start call (send offer)
async function startCall(initiator) {
    initiator.classList.add('active-voice');

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => current.webrtc.p2p.addTrack(track, stream));

    // --- Self-monitoring audio ---
    const localAudio = document.createElement("audio");
    localAudio.autoplay = true;
    localAudio.muted = false; // allow hearing yourself
    localAudio.srcObject = stream;
    document.body.appendChild(localAudio); // optional

    const offer = await current.webrtc.p2p.createOffer();
    await current.webrtc.p2p.setLocalDescription(offer);
    current.webrtc.socket.send(JSON.stringify({ offer: offer }));
};
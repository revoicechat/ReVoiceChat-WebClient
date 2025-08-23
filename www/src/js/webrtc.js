function initWebRTC() {
    console.info("Initializing WebRTC ...");

    current.webrtc.socket = new WebSocket(current.url.voiceSignal);
    current.webrtc.p2p = new RTCPeerConnection({
        iceServers: [{ urls: `stun:${current.url.voiceStun}` }]
    });

    const remoteAudio = document.getElementById("remoteAudio");

    // Handle remote audio from other peer
    current.webrtc.p2p.ontrack = event => {
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
}

// Start call (send offer)
async function startCall(roomId) {
    document.getElementById(roomId).classList.add('active-voice');
    current.webrtc.activeRoom = roomId;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => current.webrtc.p2p.addTrack(track, stream));

    // --- Self-monitoring audio ---
    /*const localAudio = document.createElement("audio");
    localAudio.autoplay = true;
    localAudio.muted = true; // allow hearing yourself
    localAudio.srcObject = stream;
    localAudio.controls = true;
    document.getElementById("localAudio").appendChild(localAudio); // optional*/

    const offer = await current.webrtc.p2p.createOffer();
    await current.webrtc.p2p.setLocalDescription(offer);
    current.webrtc.socket.send(JSON.stringify({ offer: offer, room: roomId }));
};
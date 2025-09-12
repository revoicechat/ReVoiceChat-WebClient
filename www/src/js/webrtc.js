const webrtc = {
    socket: null,
    p2p: null,
    activeRoom: null,
}

let remoteCandidates = [];
let remoteDescSet = false;

async function initWebRTC() {
    console.info("WEBRTC : Initializing");

    webrtc.socket = new WebSocket(global.url.voiceSignal);
    webrtc.p2p = new RTCPeerConnection({
        iceServers: [
            {
                urls: ["stun:stun4.l.google.com:19302", "stun:stun3.l.google.com:19302"]
            },
            {
                urls: 'turn:192.158.29.39:3478?transport=udp',
                credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
                username: '28224511:1379330808'
            }
        ]
    });

    // Handle remote audio from other peer
    webrtc.p2p.ontrack = event => {
        const remoteAudio = document.getElementById("remoteAudio");
        const audio = document.createElement("audio");
        audio.autoplay = true;
        audio.muted = false;
        audio.controls = true;
        audio.srcObject = event.streams[0];
        remoteAudio.appendChild(audio);
    };

    // Send ICE candidates to peer
    webrtc.p2p.onicecandidate = event => {
        if (event.candidate) {
            webrtc.socket.send(JSON.stringify({ candidate: event.candidate }));
        }
    };

    // Handle signaling messages
    webrtc.socket.onmessage = async (msg) => {
        const data = JSON.parse(msg.data)

        console.log(data);

        if (true || data.room === webrtc.activeRoom) {
            if (data.offer) {
                await webrtc.p2p.setRemoteDescription(new RTCSessionDescription(data.offer));

                remoteDescSet = true;
                // Add any candidates received early
                for (const candidate of remoteCandidates) {
                    await webrtc.p2p.addIceCandidate(candidate);
                }
                remoteCandidates = [];


                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                // Add mic to peer connection
                stream.getTracks().forEach(track => webrtc.p2p.addTrack(track, stream));

                const answer = await webrtc.p2p.createAnswer();
                await webrtc.p2p.setLocalDescription(answer);
                webrtc.socket.send(JSON.stringify({ answer: answer }));

            }

            if (data.answer) {
                await webrtc.p2p.setRemoteDescription(new RTCSessionDescription(data.answer));
            }

            if (data.candidate) {
                try {
                    if (remoteDescSet) {
                        await webrtc.p2p.addIceCandidate(new RTCIceCandidate(data.candidate));
                    } else {
                        remoteCandidates.push(data.candidate);
                    }
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
async function startWebRtcCall(roomId) {
    // Now clicking on button stop the call (first so you can clear old objects)
    document.getElementById(roomId).onclick = () => stopWebRtcCall(roomId);

    await initWebRTC();

    console.info(`WEBRTC : Joining voice chat ${roomId}`);

    document.getElementById(roomId).classList.add('active-voice');
    webrtc.activeRoom = roomId;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => webrtc.p2p.addTrack(track, stream));

    const offer = await webrtc.p2p.createOffer();
    await webrtc.p2p.setLocalDescription(offer);
    webrtc.socket.send(JSON.stringify({ offer: offer, room: roomId }));
};

async function stopWebRtcCall(roomId) {
    console.info(`WEBRTC : Leaving voice chat ${roomId}`);

    document.getElementById(roomId).classList.remove('active-voice');

    // Closing active connection
    webrtc.socket.close();
    webrtc.p2p.close();

    // Clearing variables
    webrtc.socket = null;
    webrtc.p2p = null;
    webrtc.activeRoom = null;

    // Clearing DOM
    document.getElementById("remoteAudio").innerHTML = "";

    // Now clicking on button start the call
    document.getElementById(roomId).onclick = () => startWebRtcCall(roomId);
}
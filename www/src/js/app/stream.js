import { PacketDecoder, PacketSender } from "./packet.js";

export default class Stream {
    static CLOSE = 0;
    static CONNECTING = 1;
    static OPEN = 2;

    #state;
    #socket;
    #user;
    #encoder;
    #packetDecoder = new PacketDecoder();
    #packetSender;
    #codecSettings = {
        codec: "vp8",
        framerate: 30,
        width: 1280,
        height: 720,
        bitrate: 3_000_000, // 3Mbits
    }

    constructor(user) {
        if (!user) {
            throw new Error('user is null or undefined');
        }

        this.#user = user;
    }

    async start(streamUrl, roomId, token) {
        if (!streamUrl) {
            throw new Error('streamUrl is null or undefined');
        }

        if (!roomId) {
            throw new Error('roomId is null or undefined');
        }

        if (!token) {
            throw new Error('token is null or undefined');
        }

        this.#state = Stream.CONNECTING;

        // Create WebSocket
        this.#socket = new WebSocket(`${streamUrl}/${roomId}`, ["Bearer." + token]);
        this.#socket.binaryType = "arraybuffer";

        // Setup packet sender
        this.#packetSender = new PacketSender(this.#socket);

        // Setup encoder and transmitter
        await this.#encodeVideo();

        // Socket states
        this.#socket.onclose = async () => { await this.close(); };
        this.#socket.onerror = async (e) => { await this.close(); console.error('Stream : WebSocket error:', e) };

        this.#state = Stream.OPEN;
    }

    stop(){
        
    }

    join(){

    }

    leave(){

    }

    async #encodeVideo() {
        const supported = await VideoEncoder.isConfigSupported(this.#codecSettings);
        if (!supported.supported) {
            throw new Error("Encoder Codec not supported");
        }

        // Setup Encoder
        this.#encoder = new VideoEncoder({
            output: (chunk) => {
                this.#packetSender.send(
                    {
                        timestamp: Date.now()
                    },
                    chunk
                );
            },
            error: (error) => { throw new Error(`Encoder setup failed:\n${error.name}\nCurrent codec :${this.#codecSettings.codec}`) },
        });

        this.#encoder.configure(this.#codecSettings);

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });

        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();

        const track = stream.getVideoTracks()[0];
        const processor = new MediaStreamTrackProcessor({ track });
        const reader = processor.readable.getReader();

        async function encodeLoop() {
            while (true) {
                const result = await reader.read();
                if (result.done) break;

                const frame = result.value;
                try {
                    this.#encoder.encode(frame, { keyFrame: false });
                } finally {
                    frame.close(); // free memory
                }
            }
        }

        encodeLoop();
    }

    #receivePacket(packet, packetDecode) {
        const result = packetDecode(packet);
        const header = result.header;
        const data = result.data;

    }
}
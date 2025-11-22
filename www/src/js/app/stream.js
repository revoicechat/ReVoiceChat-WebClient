import { PacketSender, PacketReceiver } from "./packet.js";

export default class Stream {
    static CLOSE = 0;
    static CONNECTING = 1;
    static OPEN = 2;

    #state;
    #socket;
    #user;
    #encoder;
    #encoderMetadata;
    #encoderInterval;
    #encoderConfig;
    #decoder;
    #packetSender;
    #packetReceiver;
    #streamUrl;
    #token;
    #roomId;
    #video;
    #context;
    #canvas;
    #codecConfig = {
        codec: "vp8",
        framerate: 30,
        width: 1280,
        height: 720,
        bitrate: 2_000_000
    }
    #displayMediaOptions = {
        video: {
            displaySurface: "browser",
        },
        audio: {
            suppressLocalAudioPlayback: true,
        },
        preferCurrentTab: false,
        selfBrowserSurface: "exclude",
        systemAudio: "exclude",
        surfaceSwitching: "include",
        monitorTypeSurfaces: "include",
    }

    constructor(streamUrl, user, token, roomId) {
        if (!streamUrl) {
            throw new Error('streamUrl is null or undefined');
        }

        if (!user) {
            throw new Error('user is null or undefined');
        }

        if (!token) {
            throw new Error('token is null or undefined');
        }

        if (!roomId) {
            throw new Error('roomId is null or undefined');
        }

        this.#user = user;
        this.#streamUrl = streamUrl;
        this.#token = token;
        this.#roomId = roomId;
    }

    async start(streamName, type) {
        if (!streamName) {
            throw new Error('streamName is null or undefined');
        }

        this.#state = Stream.CONNECTING;

        // Create WebSocket
        this.#socket = new WebSocket(`${this.#streamUrl}/${this.#user.id}/${streamName}`, ["Bearer." + this.#token]);
        this.#socket.binaryType = "arraybuffer";

        // Setup packet sender
        this.#packetSender = new PacketSender(this.#socket);

        // Setup encoder and transmitter
        const supported = await VideoEncoder.isConfigSupported(this.#codecConfig);
        if (!supported.supported) {
            throw new Error("Encoder Codec not supported");
        }

        // Setup Encoder
        this.#encoder = new VideoEncoder({
            output: (frame, metadata) => {
                if (!this.#encoderMetadata) {
                    this.#encoderMetadata = metadata;
                }
                this.#packetSender.send(
                    {
                        timestamp: performance.now(),
                        encoderMetadata: this.#encoderMetadata,
                    },
                    frame
                );
            },
            error: (error) => { throw new Error(`Encoder setup failed:\n${error.name}\nCurrent codec :${this.#codecConfig.codec}`) },
        });

        this.#encoderConfig = structuredClone(this.#codecConfig);
        this.#encoder.configure(this.#encoderConfig);

        this.#video = document.createElement('video');

        switch (type) {
            case "webcam":
                this.#video.srcObject = await navigator.mediaDevices.getUserMedia({ video: true });
                break;
            case "display":
                this.#video.srcObject = await navigator.mediaDevices.getDisplayMedia(this.#displayMediaOptions);
                break;
        }

        const videoPlayback = document.getElementById('videoPlayback')
        videoPlayback.appendChild(this.#video);

        await this.#video.play();

        if (window.MediaStreamTrackProcessor) {
            // Faster but not available everywhere
            const track = this.#video.srcObject.getVideoTracks()[0];
            const processor = new MediaStreamTrackProcessor({ track });
            const reader = processor.readable.getReader();

            // Grab frame
            this.#encoderInterval = setInterval(async () => {
                const result = await reader.read();
                const frame = result.value;

                this.#encoder.encode(frame, { keyFrame: true });
                frame.close();
            }, 1000 / this.#codecConfig.framerate)
        }
        else {
            // Fallback
            this.#encoderInterval = setInterval(async () => {
                const frame = new VideoFrame(this.#video, { timestamp: performance.now() * 1000 });;
                this.#reconfigureEncoderResolution(frame);
                this.#encoder.encode(frame, { keyFrame: true });
                frame.close();
            }, 1000 / this.#codecConfig.framerate)
        }

        // Socket states
        this.#socket.onclose = async () => { };
        this.#socket.onerror = async (e) => { console.error('Stream : WebSocket error:', e) };

        this.#state = Stream.OPEN;
    }

    #reconfigureEncoderResolution(frame) {
        let changed = false;

        if (frame.codedHeight && frame.codedHeight != this.#encoderConfig.height && frame.codedHeight <= this.#codecConfig.height) {
            this.#encoderConfig.height = frame.codedHeight;
            changed = true;
        }

        if (frame.codedWidth && frame.codedWidth != this.#encoderConfig.width && frame.codedWidth <= this.#codecConfig.width) {
            this.#encoderConfig.width = frame.codedWidth;
            changed = true;
        }

        if(changed){
            this.#encoder.configure(this.#encoderConfig);
        }
    }

    async stop() {
        // Stop frame grabbing
        if (this.#encoderInterval) {
            clearInterval(this.#encoderInterval);
            this.#encoderInterval = null;
        }

        // Close WebSocket
        if (this.#socket && (this.#socket.readyState === WebSocket.OPEN || this.#socket.readyState === WebSocket.CONNECTING)) {
            await this.#socket.close();
            this.#socket = null;
        }

        // Close encoder
        if (this.#encoder && this.#encoder.state !== "closed") {
            this.#encoder.close();
            this.#encoder = null;
        }

        // Close playback
        if (this.#video) {
            await this.#video.pause();
            this.#video.remove();
            this.#video = null;
        }

        this.#state = Stream.CLOSE;
    }

    async join(userId, streamName) {
        if (userId && streamName) {
            const isSupported = await VideoDecoder.isConfigSupported(this.#codecConfig);

            if (isSupported.supported) {
                // Create WebSocket
                this.#socket = new WebSocket(`${this.#streamUrl}/${userId}/${streamName}`, ["Bearer." + this.#token]);
                this.#socket.binaryType = "arraybuffer";
                this.#packetReceiver = new PacketReceiver(this.#socket, (header, data) => this.#decodeVideo(header, data));

                this.#canvas = document.createElement("canvas");
                this.#context = this.#canvas.getContext("2d");
                const videoRemote = document.getElementById('videoRemote');

                videoRemote.appendChild(this.#canvas);

                this.#decoder = new VideoDecoder({
                    output: (frame) => {
                        const videoRemote = document.getElementById('videoRemote');
                        const ratio = frame.codedHeight / frame.codedWidth;
                        const width = videoRemote.clientWidth;
                        const height = width * ratio;
                        this.#canvas.width = width;
                        this.#canvas.height = height;
                        this.#context.drawImage(frame, 0, 0, width, height);
                        frame.close();
                    },
                    error: (error) => { throw new Error(`VideoDecoder error:\n${error.name}\nCurrent codec :${this.#codecConfig.codec}`) }
                });

                return true;
            }
            return false;
        }
    }

    async leave() {
        // Close WebSocket
        if (this.#socket && (this.#socket.readyState === WebSocket.OPEN || this.#socket.readyState === WebSocket.CONNECTING)) {
            await this.#socket.close();
            this.#socket = null;
        }

        // Close decoder
        if (this.#decoder && this.#decoder.state !== "closed") {
            this.#decoder.close();
            this.#decoder = null;
        }

        // Close playback
        if (this.#canvas && this.#context) {
            this.#canvas.remove();
            this.#canvas = null;
            this.#context = null;
        }
    }

    #decodeVideo(header, data) {
        const chunk = new EncodedVideoChunk({
            type: "key",
            timestamp: header.timestamp,
            data: new Uint8Array(data)
        });

        if (this.#decoder.state === "unconfigured") {
            console.log(header.encoderMetadata);
            this.#decoder.configure(header.encoderMetadata.decoderConfig);
        }

        this.#decoder.decode(chunk);
    }
}
import { LargePacketSender, LargePacketReceiver, EncodedPacket, DecodedPacket } from "./packet.js";

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
    #streamUrl;
    #token;
    #videoPlayer;
    #videoItem;
    #context;
    #canvas;
    #keyframeCounter = 0;
    #codecConfig = {
        codec: "vp8",
        framerate: 30,
        width: 1280,
        height: 720,
        bitrate: 4_000_000,
        //hardwareAcceleration: "prefer-hardware",
        latencyMode: "realtime",
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

    constructor(streamUrl, user, token) {
        if (!streamUrl) {
            throw new Error('streamUrl is null or undefined');
        }

        if (!user) {
            throw new Error('user is null or undefined');
        }

        if (!token) {
            throw new Error('token is null or undefined');
        }

        this.#user = user;
        this.#streamUrl = streamUrl;
        this.#token = token;
    }

    async start(streamName, type) {
        if (!streamName) {
            throw new Error('streamName is null or undefined');
        }

        this.#state = Stream.CONNECTING;

        // Setup encoder and transmitter 
        // First so we don't open socket for no reason
        const supported = await VideoEncoder.isConfigSupported(this.#codecConfig);
        if (!supported.supported) {
            throw new Error("Encoder Codec not supported");
        }

        // Video player
        this.#videoPlayer = document.createElement('video');
        this.#videoPlayer.className = "content";

        // Video item (box)
        this.#videoItem = document.createElement('div');
        this.#videoItem.className = "stream item";
        this.#videoItem.onclick = () => { this.focus(this.#videoItem) }
        this.#videoItem.appendChild(this.#videoPlayer);

        // Stream container
        const streamContainter = document.getElementById('stream-container')
        streamContainter.appendChild(this.#videoItem);

        switch (type) {
            case "webcam":
                this.#videoPlayer.srcObject = await navigator.mediaDevices.getUserMedia({ video: true });
                break;
            case "display":
                this.#videoPlayer.srcObject = await navigator.mediaDevices.getDisplayMedia(this.#displayMediaOptions);
                break;
        }

        await this.#videoPlayer.play();

        // Create WebSocket
        this.#socket = new WebSocket(`${this.#streamUrl}/${this.#user.id}/${streamName}`, ["Bearer." + this.#token]);
        this.#socket.binaryType = "arraybuffer";

        // Setup packet sender
        this.#packetSender = new LargePacketSender(this.#socket);

        // Setup Encoder
        this.#encoder = new VideoEncoder({
            output: (frame, metadata) => {
                if (!this.#encoderMetadata) {
                    this.#encoderMetadata = metadata;
                }
                const header = {
                    timestamp: performance.now(),
                    encoderMetadata: this.#encoderMetadata,
                }
                this.#packetSender.send(new EncodedPacket(header, frame).data);
            },
            error: (error) => { throw new Error(`Encoder setup failed:\n${error.name}\nCurrent codec :${this.#codecConfig.codec}`) },
        });

        // Encoder
        this.#encoderConfig = structuredClone(this.#codecConfig);
        this.#encoder.configure(this.#encoderConfig);

        if (window.MediaStreamTrackProcessor) {
            // Faster but not available everywhere
            const track = this.#videoPlayer.srcObject.getVideoTracks()[0];
            const processor = new MediaStreamTrackProcessor({ track });
            const reader = processor.readable.getReader();

            // Grab frame
            this.#encoderInterval = setInterval(async () => {
                const result = await reader.read();
                const frame = result.value;
                this.#reconfigureEncoderResolution(frame);
                if (this.#encoder) {
                    this.#encoder.encode(frame, { keyFrame: this.#isKeyframe() });
                }
                await frame.close();
            }, 1000 / this.#codecConfig.framerate)
        }
        else {
            // Fallback
            this.#encoderInterval = setInterval(async () => {
                const frame = new VideoFrame(this.#videoPlayer, { timestamp: performance.now() * 1000 });;
                this.#reconfigureEncoderResolution(frame);
                if (this.#encoder) {
                    this.#encoder.encode(frame, { keyFrame: this.#isKeyframe() });
                }
                frame.close();
            }, 1000 / this.#codecConfig.framerate)
        }

        // Socket states
        this.#socket.onclose = async () => { };
        this.#socket.onerror = async (e) => { console.error('Stream : WebSocket error:', e) };

        this.#state = Stream.OPEN;
    }

    #isKeyframe() {
        this.#keyframeCounter++;
        if (this.#keyframeCounter > this.#codecConfig.framerate) {
            this.#keyframeCounter = 0;
            return true;
        }
        return false
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

        if (changed) {
            this.#encoder.configure(this.#encoderConfig);
            this.#encoderMetadata.decoderMetadata.codedHeight = this.#encoderConfig.height;
            this.#encoderMetadata.decoderMetadata.codedWidth = this.#encoderConfig.width;
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
        if (this.#videoPlayer) {
            await this.#videoPlayer.pause();
            this.#videoItem.remove();
            this.#videoItem = null;
            this.#videoPlayer = null;
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

                new LargePacketReceiver(this.#socket, (rawData) => { this.#decodeVideo(new DecodedPacket(rawData)) });

                // Video player
                this.#canvas = document.createElement("canvas");
                this.#context = this.#canvas.getContext("2d");

                // Video item (box)
                this.#videoItem = document.createElement('div');
                this.#videoItem.className = "stream item";
                this.#videoItem.onclick = () => { this.focus(this.#videoItem) }
                this.#videoItem.appendChild(this.#canvas);

                // Stream container
                const streamContainter = document.getElementById('stream-container')
                streamContainter.appendChild(this.#videoItem);

                this.#decoder = new VideoDecoder({
                    output: (frame) => {
                        // TO DO : Optimise this
                        const resolution = this.#determineResolution(frame, this.#videoItem);
                        this.#canvas.width = resolution.width;
                        this.#canvas.height = resolution.height;

                        this.#context.drawImage(frame, 0, 0, this.#canvas.width, this.#canvas.height);
                        frame.close();
                    },
                    error: (error) => { throw new Error(`VideoDecoder error:\n${error.name}\nCurrent codec :${this.#codecConfig.codec}`) }
                });

                return true;
            }
            return false;
        }
    }

    #determineResolution(frame, videoItem) {
        let result = { width: 0, height: 0 };

        if (frame.codedWidth > videoItem.clientWidth) {
            // Clamp by width
            const ratioHW = frame.codedHeight / frame.codedWidth;
            result.width = videoItem.clientWidth;
            result.height = result.width * ratioHW;
        }
        else {
            // Clamp by height
            const ratioWH = frame.codedWidth / frame.codedHeight;
            result.height = videoItem.clientHeight;
            result.width = result.height * ratioWH;
        }

        return result;
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
        if (this.#videoItem && this.#canvas && this.#context) {
            this.#videoItem.remove();
            this.#videoItem = null;
            this.#canvas = null;
            this.#context = null;
        }
    }

    focus(element) {
        for (const child of element.parentElement.children) {
            child.classList.add("hidden");
        }
        element.classList.remove("hidden");
        element.parentElement.style.display = "block";
        element.onclick = () => { this.unfocus(element); }
    }

    unfocus(element) {
        for (const child of element.parentElement.children) {
            child.classList.remove("hidden");
        }
        element.parentElement.style.display = "flex";
        element.onclick = () => { this.focus(element); }
    }

    #decodeVideo(decodedPacket) {
        const header = decodedPacket.header;
        const data = decodedPacket.data;

        const chunk = new EncodedVideoChunk({
            type: "key",
            timestamp: header.timestamp,
            data: new Uint8Array(data)
        });

        if (this.#decoder.state === "unconfigured") {
            this.#decoder.configure(header.encoderMetadata.decoderConfig);
        }

        this.#decoder.decode(chunk);
    }
}
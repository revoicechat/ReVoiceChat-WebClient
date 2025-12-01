import { LargePacketSender, LargePacketReceiver, EncodedPacket, DecodedPacket } from "./packet.js";

export class Streamer {
    static CLOSE = 0;
    static CONNECTING = 1;
    static OPEN = 2;

    #state;
    #socket;
    #user;
    #packetSender;
    #streamUrl;
    #token;
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
        video: true,
        audio: {
            suppressLocalAudioPlayback: true,
        },
        preferCurrentTab: false,
        selfBrowserSurface: "include",
        systemAudio: "include",
        surfaceSwitching: "include",
        monitorTypeSurfaces: "include",
    }

    // Local playback
    #player;
    #playerDiv;

    // Audio Encoder
    #audioEncoder;

    // Video Encoder
    #videoMetadata;
    #videoEncoder;
    #videoEncoderInterval;
    #videoEncoderConfig;
    #keyframeCounter = 0;

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

        this.#state = Streamer.CONNECTING;

        // Setup encoder and transmitter 
        // First so we don't open socket for no reason
        const supported = await VideoEncoder.isConfigSupported(this.#codecConfig);
        if (!supported.supported) {
            throw new Error("Encoder Codec not supported");
        }

        // Video player
        this.#player = document.createElement('video');
        this.#player.className = "content";

        // Video player (box)
        this.#playerDiv = document.createElement('div');
        this.#playerDiv.className = "player";
        this.#playerDiv.appendChild(this.#player);

        // Streamer container
        const streamContainter = document.getElementById('stream-container')
        streamContainter.appendChild(this.#playerDiv);

        try {
            switch (type) {
                case "webcam":
                    this.#player.srcObject = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                    break;
                case "display":
                    this.#player.srcObject = await navigator.mediaDevices.getDisplayMedia(this.#displayMediaOptions);
                    break;
            }
        }
        catch (error) {
            this.stop();
            throw new Error(`MediaDevice setup failed:\n${error}`);
        }

        await this.#player.play();

        // Create WebSocket
        this.#socket = new WebSocket(`${this.#streamUrl}/${this.#user.id}/${streamName}`, ["Bearer." + this.#token]);
        this.#socket.binaryType = "arraybuffer";

        // Setup packet sender
        this.#packetSender = new LargePacketSender(this.#socket);

        // Setup Encoder
        this.#videoEncoder = new VideoEncoder({
            output: (frame, metadata) => {
                if (!this.#videoMetadata) {
                    this.#videoMetadata = metadata;
                }
                const header = {
                    timestamp: parseInt(performance.now()),
                    keyframe: this.#isKeyframe(),
                    metadata: this.#videoMetadata,
                }
                this.#packetSender.send(new EncodedPacket(header, frame).data);
            },
            error: (error) => {
                this.stop();
                throw new Error(`Encoder setup failed:\n${error.name}\nCurrent codec :${this.#codecConfig.codec}`);
            },
        });

        // Encoder
        this.#videoEncoderConfig = structuredClone(this.#codecConfig);
        this.#videoEncoder.configure(this.#videoEncoderConfig);

        if (window.MediaStreamTrackProcessor) {
            // Faster but not available everywhere
            const track = this.#player.srcObject.getVideoTracks()[0];
            const processor = new MediaStreamTrackProcessor({ track });
            const reader = processor.readable.getReader();

            // Grab frame
            this.#videoEncoderInterval = setInterval(async () => {
                const result = await reader.read();
                const frame = result.value;
                if (frame) {
                    await this.#reconfigureEncoderResolution(frame);
                    if (this.#videoEncoder) {
                        await this.#videoEncoder.encode(frame, { keyFrame: this.#isKeyframe() });
                    }
                    await frame.close();
                }
                else {
                    this.stop();
                }
            }, 1000 / this.#codecConfig.framerate)
        }
        else {
            // Fallback
            this.#videoEncoderInterval = setInterval(async () => {
                const frame = new VideoFrame(this.#player, { timestamp: performance.now() * 1000 });;
                await this.#reconfigureEncoderResolution(frame);
                if (this.#videoEncoder) {
                    await this.#videoEncoder.encode(frame, { keyFrame: this.#isKeyframe() });
                }
                frame.close();
            }, 1000 / this.#codecConfig.framerate)
        }

        // Socket states
        this.#socket.onclose = async () => { };
        this.#socket.onerror = async (e) => { console.error('Streamer : WebSocket error:', e) };

        this.#state = Streamer.OPEN;
        return this.#playerDiv;
    }

    #isKeyframe(count = true) {
        if (count) {
            this.#keyframeCounter++;
        }
        if (this.#keyframeCounter > this.#codecConfig.framerate) {
            this.#keyframeCounter = 0;
            return true;
        }
        return false
    }

    async #reconfigureEncoderResolution(frame) {
        if (frame.codedHeight === this.#videoEncoderConfig.height && frame.codedWidth === this.#videoEncoderConfig.width) {
            // Captured frame and encoderCondig already match in width and height
            return;
        }

        // Frame H & W are smaller than Max Codec H & W
        if (frame.codedHeight < this.#codecConfig.height && frame.codedWidth < this.#codecConfig.width) {
            await this.#setEncoderResolution(frame.codedHeight, frame.codedWidth);
            return;
        }

        const ratio = Math.min((this.#codecConfig.height / frame.codedHeight), (this.#codecConfig.width / frame.codedWidth));
        const height = frame.codedHeight * ratio;
        const width = frame.codedWidth * ratio;
        await this.#setEncoderResolution(height, width);
    }

    async #setEncoderResolution(height, width) {
        this.#videoEncoderConfig.height = height;
        this.#videoEncoderConfig.width = width;

        if (this.#videoMetadata && this.#videoMetadata.decoderMetadata) {
            this.#videoMetadata.decoderMetadata.codedHeight = height;
            this.#videoMetadata.decoderMetadata.codedWidth = width;
        }

        if (this.#videoEncoder) {
            await this.#videoEncoder.configure(this.#videoEncoderConfig);
        }
    }

    async stop() {
        // Stop frame grabbing
        if (this.#videoEncoderInterval) {
            clearInterval(this.#videoEncoderInterval);
            this.#videoEncoderInterval = null;
        }

        // Close WebSocket
        if (this.#socket && (this.#socket.readyState === WebSocket.OPEN || this.#socket.readyState === WebSocket.CONNECTING)) {
            await this.#socket.close();
            this.#socket = null;
        }

        // Close encoder
        if (this.#videoEncoder && this.#videoEncoder.state !== "closed") {
            await this.#videoEncoder.close();
            this.#videoEncoder = null;
        }

        // Close playback
        if (this.#player) {
            await this.#player.pause();
            this.#playerDiv.remove();
            this.#playerDiv = null;
            this.#player = null;
        }

        this.#state = Streamer.CLOSE;
    }
}

export class Viewer {
    #socket;

    #streamUrl;
    #token;
    #codecConfig = {
        codec: "vp8",
        framerate: 30,
        width: 1280,
        height: 720,
        bitrate: 4_000_000,
        //hardwareAcceleration: "prefer-hardware",
        latencyMode: "realtime",
    }


    // Local playback
    #playerDiv;
    #context;
    #canvas;
    #lastFrame = {
        clientWidth: 0,
        clientHeight: 0,
        codedWidth: 0,
        codedHeight: 0
    }

    // Video decoder
    #videoDecoder;
    #videoDecoderKeyFrame = false;

    constructor(streamUrl, token) {
        if (!streamUrl) {
            throw new Error('streamUrl is null or undefined');
        }

        if (!token) {
            throw new Error('token is null or undefined');
        }

        this.#streamUrl = streamUrl;
        this.#token = token;
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

                // Video player (box)
                this.#playerDiv = document.createElement('div');
                this.#playerDiv.className = "player";
                this.#playerDiv.appendChild(this.#canvas);

                // Streamer container
                const streamContainter = document.getElementById('stream-container')
                streamContainter.appendChild(this.#playerDiv);

                this.#videoDecoder = new VideoDecoder({
                    output: (frame) => {
                        this.#reconfigureCanvasResolution(frame, this.#playerDiv);
                        this.#context.drawImage(frame, 0, 0, this.#canvas.width, this.#canvas.height);
                        frame.close();
                    },
                    error: (error) => { throw new Error(`VideoDecoder error:\n${error.name}\nCurrent codec :${this.#codecConfig.codec}`) }
                });

                return this.#playerDiv;
            }
            return null;
        }
    }

    #reconfigureCanvasResolution(frame, videoItem) {
        if (this.#lastFrame.clientWidth != videoItem.clientWidth || this.#lastFrame.clientHeight != videoItem.clientHeight ||
            this.#lastFrame.codedWidth != frame.codedWidth || this.#lastFrame.codedHeight != frame.codedHeight) {
            const ratio = Math.min((videoItem.clientHeight / frame.codedHeight), (videoItem.clientWidth / frame.codedWidth));
            this.#canvas.height = frame.codedHeight * ratio;
            this.#canvas.width = frame.codedWidth * ratio;

            this.#lastFrame.clientHeight = videoItem.clientHeight;
            this.#lastFrame.clientWidth = videoItem.clientWidth;
            this.#lastFrame.codedHeight = frame.codedHeight;
            this.#lastFrame.codedWidth = frame.codedWidth;
        }
    }

    async leave() {
        // Close WebSocket
        if (this.#socket && (this.#socket.readyState === WebSocket.OPEN || this.#socket.readyState === WebSocket.CONNECTING)) {
            await this.#socket.close();
            this.#socket = null;
        }

        // Close decoder
        if (this.#videoDecoder && this.#videoDecoder.state !== "closed") {
            await this.#videoDecoder.close();
            this.#videoDecoder = null;
        }

        // Close playback
        if (this.#playerDiv && this.#canvas && this.#context) {
            this.#playerDiv.remove();
            this.#playerDiv = null;
            this.#canvas = null;
            this.#context = null;
        }
    }

    #decodeVideo(decodedPacket) {
        const header = decodedPacket.header;
        const data = decodedPacket.data;

        // Decoder didn't get a keyFrame yet
        if (!this.#videoDecoderKeyFrame) {
            if (header.keyframe) {
                this.#videoDecoderKeyFrame = true;
            }
            return;
        }

        if (this.#videoDecoder.state === "unconfigured") {
            this.#videoDecoder.configure(header.metadata.decoderConfig);
        }

        this.#videoDecoder.decode(new EncodedVideoChunk({
            type: "key",
            timestamp: header.timestamp,
            data: new Uint8Array(data)
        }));
    }
}
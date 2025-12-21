import { LargePacketSender, LargePacketReceiver } from "./packet.js";
import Codec from "./codec.js";

export class Streamer {
    static CLOSE = 0;
    static CONNECTING = 1;
    static OPEN = 2;

    #state; // NOSONAR - for debugging purpose
    #socket;
    #user;
    #packetSender;
    #streamUrl;
    #token;
    #multiplexer = new Multiplexer();

    #displayMediaOptions = {
        video: true,
        audio: {
            channelCount: 2,
            sampleRate: 48000,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
        },
        preferCurrentTab: false,
        selfBrowserSurface: "include",
        systemAudio: "include",
        surfaceSwitching: "include",
        monitorTypeSurfaces: "include",
    }

    // Local playback
    #player;

    // Audio Encoder
    #audioCodec = structuredClone(Codec.STREAM_AUDIO);
    #audioBuffer = [];
    #audioBufferMaxLength = Number.parseInt(this.#audioCodec.sampleRate * this.#audioCodec.numberOfChannels * (this.#audioCodec.opus.frameDuration / 1_000_000)); // 2ch x 48000Hz × 0.020 sec = 1920 samples
    #audioCollector;
    #audioContext;
    #audioEncoder;
    #audioTimestamp = 0;

    // Video Encoder
    #videoCodec;
    #videoMetadata;
    #videoEncoder;
    #videoEncoderInterval;
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

    async start(type, videoCodec) {
        if (!type) {
            throw new Error('type is null or undefined');
        }

        if(!videoCodec){
            throw new Error('videoCodec is null or undefined');
        }

        this.#videoCodec = videoCodec;
        this.#state = Streamer.CONNECTING;

        // Test if codecs are supported first, so we don't open a socket for no reason
        const audioSupported = (await AudioEncoder.isConfigSupported(this.#audioCodec)).supported;
        const videoSupported = (await VideoEncoder.isConfigSupported(this.#videoCodec)).supported;
        if (!audioSupported || !videoSupported) {
            throw new Error("Audio or Video Encoder Codec not supported");
        }

        // Video player
        this.#player = document.createElement('video');
        this.#player.className = "content";
        this.#player.volume = 0; // IMPORTANT

        // Request capture
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
        this.#socket = new WebSocket(`${this.#streamUrl}/${this.#user.id}/${type}`, ["Bearer." + this.#token]);
        this.#socket.binaryType = "arraybuffer";
        this.#socket.onclose = async () => { await this.stop(); };
        this.#socket.onerror = async (e) => { await this.stop(); console.error('Streamer : WebSocket error:', e) };

        // Create LargePacketSender
        this.#packetSender = new LargePacketSender(this.#socket);

        // Create Encoders
        this.#audioEncoder = new AudioEncoder({
            output: (frame) => {
                const header = {
                    timestamp: Number.parseInt(this.#audioTimestamp / 1000),
                }
                this.#packetSender.send(this.#multiplexer.process(header, frame, Multiplexer.AUDIO));
            },
            error: (error) => { throw new Error(`Encoder setup failed:\n${error.name}\nCurrent codec :${this.#audioCodec.codec}`) },
        })

        this.#videoEncoder = new VideoEncoder({
            output: (frame, metadata) => {
                if (!this.#videoMetadata) {
                    this.#videoMetadata = metadata.decoderConfig;
                }
                const header = {
                    timestamp: Number.parseInt(performance.now()),
                    keyframe: frame.type === "key",
                    metadata: this.#videoMetadata,
                }
                this.#packetSender.send(this.#multiplexer.process(header, frame, Multiplexer.VIDEO));
            },
            error: (error) => {
                this.stop();
                throw new Error(`Encoder setup failed:\n${error.name}\nCurrent codec :${this.#videoCodec.codec}`);
            },
        });

        // Configure Encoders
        this.#audioEncoder.configure(this.#audioCodec);
        this.#videoEncoder.configure(this.#videoCodec);

        // Process audio
        const audioTracks = this.#player.srcObject.getAudioTracks();
        if (audioTracks.length === 0) {
            console.warn("No audio track available");
        } else {
            // Init AudioContext
            this.#audioContext = new AudioContext({ sampleRate: this.#audioCodec.sampleRate });
            this.#audioContext.channelCountMode = "explicit";
            this.#audioContext.channelInterpretation = "discrete";
            this.#audioContext.channelCount = 2;

            await this.#audioContext.audioWorklet.addModule('src/js/app/audio.processors.js');

            const audioStream = this.#audioContext.createMediaStreamSource(this.#player.srcObject);

            this.#audioCollector = new AudioWorkletNode(this.#audioContext, "StereoCollector", {
                channelCount: 2,
                channelCountMode: "explicit",
                channelInterpretation: "discrete"
            });

            audioStream.connect(this.#audioCollector);

            this.#audioCollector.port.onmessage = (event) => {
                const { samples, channels } = event.data;

                this.#audioBuffer.push(...samples);

                while (this.#audioBuffer.length >= this.#audioBufferMaxLength) {
                    const frames = this.#audioBuffer.slice(0, this.#audioBufferMaxLength);
                    const numberOfFrames = Number.parseInt(frames.length / channels);
                    this.#audioBuffer = this.#audioBuffer.slice(this.#audioBufferMaxLength);

                    const audioFrame = new AudioData({
                        format: "f32",
                        sampleRate: this.#audioContext.sampleRate,
                        numberOfFrames: numberOfFrames,
                        numberOfChannels: channels,
                        timestamp: this.#audioTimestamp,
                        data: new Float32Array(frames).buffer
                    });

                    if (this.#audioEncoder !== null && this.#audioEncoder.state === "configured") {
                        this.#audioEncoder.encode(audioFrame);
                    }
                    audioFrame.close();
                    this.#audioTimestamp += (numberOfFrames / this.#audioContext.sampleRate) * 1_000_000;
                }
            }
        }

        // Process video
        if (globalThis.MediaStreamTrackProcessor) {
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
            }, 1000 / this.#videoCodec.framerate)
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
            }, 1000 / this.#videoCodec.framerate)
        }

        this.#state = Streamer.OPEN;
        return this.#player;
    }

    #isKeyframe() {
        this.#keyframeCounter++;
        if (this.#keyframeCounter >= this.#videoCodec.framerate) {
            this.#keyframeCounter = 0;
            return true;
        }
        return false
    }

    async #reconfigureEncoderResolution(frame) {
        if (frame.codedHeight === this.#videoCodec.height && frame.codedWidth === this.#videoCodec.width) {
            // Captured frame and encoderCondig already match in width and height
            return;
        }

        // Frame H & W are smaller than Max Codec H & W
        if (frame.codedHeight < this.#videoCodec.height && frame.codedWidth < this.#videoCodec.width) {
            await this.#setEncoderResolution(Number.parseInt(frame.codedHeight), Number.parseInt(frame.codedWidth));
            return;
        }

        const ratio = Math.min((this.#videoCodec.height / frame.codedHeight), (this.#videoCodec.width / frame.codedWidth));
        const height = Number.parseInt(frame.codedHeight * ratio);
        const width = Number.parseInt(frame.codedWidth * ratio);
        await this.#setEncoderResolution(height, width);
    }

    async #setEncoderResolution(height, width) {
        this.#videoCodec.height = height;
        this.#videoCodec.width = width;

        if (this.#videoMetadata && this.#videoMetadata.decoderMetadata) {
            this.#videoMetadata.decoderMetadata.codedHeight = height;
            this.#videoMetadata.decoderMetadata.codedWidth = width;
        }

        if (this.#videoEncoder) {
            await this.#videoEncoder.configure(this.#videoCodec);
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

        // Close audioContext
        if (this.#audioContext && this.#audioContext.state !== "closed") {
            this.#audioContext.close();
            this.#audioContext = null;
        }

        // Close playback
        if (this.#player) {
            await this.#player.pause();
            this.#player = null;
        }

        this.#state = Streamer.CLOSE;
    }
}

export class Viewer {
    #socket;
    #demultiplexer;
    #streamUrl;
    #token;

    // Local playback
    #context;
    #canvas;
    #lastFrame = {
        clientWidth: 0,
        clientHeight: 0,
        codedWidth: 0,
        codedHeight: 0
    }

    // Audio decoder
    #audioCodec = structuredClone(Codec.STREAM_AUDIO);
    #audioContext;
    #audioDecoder;
    #audioGain;
    #audioVolume = 0.5;
    #audioPlayhead = 0;

    // Video decoder
    #videoDecoder;
    #videoDecoderKeyFrame = false;

    constructor(streamUrl, token, userSettings) {
        if (!streamUrl) {
            throw new Error('streamUrl is null or undefined');
        }

        if (!token) {
            throw new Error('token is null or undefined');
        }

        this.#streamUrl = streamUrl;
        this.#token = token;
        this.#audioVolume = userSettings.getStreamVolume();
    }

    async join(userId, streamName) {
        if (userId && streamName) {
            const audioSupported = await AudioDecoder.isConfigSupported(this.#audioCodec);

            if (!audioSupported) {
                console.error("Audio codec not supported");
                return null;
            }

            // Create WebSocket
            this.#socket = new WebSocket(`${this.#streamUrl}/${userId}/${streamName}`, ["Bearer." + this.#token]);
            this.#socket.binaryType = "arraybuffer";
            this.#socket.onclose = async () => { await this.leave(); };
            this.#socket.onerror = async (e) => { await this.leave(); console.error('Streamer : WebSocket error:', e) };

            this.#demultiplexer = new Demultiplexer(
                (header, data) => { this.#decodeAudio(header, data) },
                (header, data) => { this.#decodeVideo(header, data) }
            );

            const receiver = new LargePacketReceiver();
            receiver.init(this.#socket, (rawData) => { this.#demultiplexer.process(rawData) });

            // Video player
            this.#canvas = document.createElement("canvas");
            this.#context = this.#canvas.getContext("2d");

            // AudioContext
            this.#audioContext = new AudioContext({ sampleRate: this.#audioCodec.sampleRate });

            // Audio gain (volume)
            this.#audioGain = this.#audioContext.createGain();
            this.#audioGain.gain.setValueAtTime(this.#audioVolume, this.#audioContext.currentTime);
            this.#audioGain.channelCountMode = "explicit";
            this.#audioGain.channelInterpretation = "discrete";


            // Audio decoder
            this.#audioDecoder = new AudioDecoder({
                output: (chunk) => { this.#playbackAudio(chunk) },
                error: (error) => { throw new Error(`AudioDecoder setup failed:\n${error.name}\nCurrent codec :${this.#audioCodec.codec}`) },
            });
            await this.#audioDecoder.configure(this.#audioCodec);

            // Video decoder
            this.#videoDecoder = new VideoDecoder({
                output: (frame) => {
                    this.#reconfigureCanvasResolution(frame, this.#canvas);
                    this.#context.drawImage(frame, 0, 0, this.#canvas.width, this.#canvas.height);
                    frame.close();
                },
                error: (error) => { throw new Error(`VideoDecoder error:\n${error.name}`) }
            });

            return this.#canvas;
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
        // WebSocket
        if (this.#socket && (this.#socket.readyState === WebSocket.OPEN || this.#socket.readyState === WebSocket.CONNECTING)) {
            await this.#socket.close();
            this.#socket = null;
        }

        // audioDecoder
        if (this.#audioDecoder && this.#audioDecoder.state !== "closed") {
            await this.#audioDecoder.close();
            this.#audioDecoder = null;
        }

        // audioContext
        if (this.#audioContext && this.#audioContext.state !== "closed") {
            this.#audioContext.close();
            this.#audioContext = null;
        }

        // videoDecoder
        if (this.#videoDecoder && this.#videoDecoder.state !== "closed") {
            await this.#videoDecoder.close();
            this.#videoDecoder = null;
        }

        // video playback
        if (this.#canvas && this.#context) {
            this.#canvas = null;
            this.#context = null;
        }
    }

    #decodeVideo(header, data) {
        // Decoder didn't get a keyFrame yet
        if (!this.#videoDecoderKeyFrame) {
            if (header.keyframe) {
                this.#videoDecoderKeyFrame = true;
            }
            return;
        }

        if (this.#videoDecoder.state === "unconfigured") {
            this.#videoDecoder.configure(header.metadata);
        }

        this.#videoDecoder.decode(new EncodedVideoChunk({
            type: "key",
            timestamp: header.timestamp,
            data: new Uint8Array(data)
        }));
    }

    #decodeAudio(header, data) {
        if (this.#audioDecoder !== null && this.#audioDecoder.state === "configured") {
            this.#audioDecoder.decode(new EncodedAudioChunk({
                type: "key",
                timestamp: Number.parseInt(header.timestamp * 1000),
                data: new Uint8Array(data),
            }));
        } else {
            console.error(`No AudioDecoder correctly configured found for this stream`);
        }
    }

    #playbackAudio(audioData) {
        const buffer = this.#audioContext.createBuffer(
            audioData.numberOfChannels,
            audioData.numberOfFrames,
            audioData.sampleRate
        );

        const interleaved = new Float32Array(audioData.numberOfFrames * audioData.numberOfChannels);
        audioData.copyTo(interleaved, { planeIndex: 0 });

        // De-interleave into buffer channels
        for (let ch = 0; ch < audioData.numberOfChannels; ch++) {
            const channelData = new Float32Array(audioData.numberOfFrames);
            for (let i = 0; i < audioData.numberOfFrames; i++) {
                channelData[i] = interleaved[i * audioData.numberOfChannels + ch];
            }
            buffer.copyToChannel(channelData, ch);
        }

        const source = this.#audioContext.createBufferSource();
        source.channelCount = buffer.numberOfChannels;
        source.channelCountMode = "explicit";
        source.channelInterpretation = "discrete";
        source.buffer = buffer;

        // Routing : decodedAudio -> gain (volume) -> output 
        source.connect(this.#audioGain);
        this.#audioGain.connect(this.#audioContext.destination);

        this.#audioPlayhead = Math.max(this.#audioPlayhead, this.#audioContext.currentTime) + buffer.duration;
        source.start(this.#audioPlayhead);
        audioData.close();
    }

    setVolume(value) {
        this.#audioVolume = value;
        this.#audioGain.gain.setValueAtTime(this.#audioVolume, this.#audioContext.currentTime);
    }

    getVolume() {
        return this.#audioVolume;
    }
}

/**
 * Multiplexer / Demultiplexer frame structure 
 * [ 1 byte  ] Stream type (0 = video, 1 = audio)
 * [ 4 bytes ] Header length (Uint32)
 * [ X bytes ] Header (optional)
 * [ 4 bytes ] Payload length (Uint32)
 * [ Y bytes ] Encoded payload (video or audio chunk)
 */

class Multiplexer {
    static VIDEO = 0;
    static AUDIO = 1;

    process(header, chunk, streamType) {
        const headerBytes = header ? new TextEncoder().encode(JSON.stringify(header)) : new Uint8Array(0);
        const payload = new Uint8Array(chunk.byteLength);
        chunk.copyTo(payload);

        const headerSize = 1 + 4 + headerBytes.length + 4;
        const buffer = new ArrayBuffer(headerSize + payload.length);
        const view = new DataView(buffer);
        let offset = 0;

        // Stream type (0 = video)
        view.setUint8(offset, streamType);
        offset += 1;

        // Header length
        view.setUint32(offset, headerBytes.length, true);
        offset += 4;

        // Header
        new Uint8Array(buffer, offset, headerBytes.length).set(headerBytes);
        offset += headerBytes.length;

        // Payload (chunk)
        view.setUint32(offset, payload.length, true); offset += 4;
        new Uint8Array(buffer, offset, payload.length).set(payload);

        return buffer;
    }
}

class Demultiplexer {
    #audioCallback;
    #videoCallback;

    constructor(audioCallback, videoCallback) {
        this.#audioCallback = audioCallback;
        this.#videoCallback = videoCallback;
    }

    process(rawData) {
        const buffer = rawData;
        const view = new DataView(buffer);
        let offset = 0;

        const streamType = view.getUint8(offset);
        offset += 1;  // 0=video, 1=audio

        const configLen = view.getUint32(offset, true);
        offset += 4;

        let header = null;
        if (configLen > 0) {
            const configJson = new TextDecoder().decode(
                new Uint8Array(buffer, offset, configLen)
            );
            header = JSON.parse(configJson);
        }
        offset += configLen;

        const payloadLen = view.getUint32(offset, true);
        offset += 4;

        const payload = new Uint8Array(buffer, offset, payloadLen);

        if (streamType === Multiplexer.VIDEO) {
            // Video
            this.#videoCallback(header, payload);
        } else {
            // Audio
            this.#audioCallback(header, payload);
        }
    }
}
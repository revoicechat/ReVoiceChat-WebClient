import { PacketDecoder, PacketSender } from "./packet.js";

export default class Stream {
    static CLOSE = 0;
    static CONNECTING = 1;
    static OPEN = 2;

    #state;
    #socket;
    #user;
    #encoder;
    #encoderMetadata;
    #decoder;
    #packetDecoder = new PacketDecoder();
    #packetSender;
    #streamUrl;
    #token;
    #roomId;
    #codecSettings = {
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
        systemAudio: "include",
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
        const supported = await VideoEncoder.isConfigSupported(this.#codecSettings);
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
            error: (error) => { throw new Error(`Encoder setup failed:\n${error.name}\nCurrent codec :${this.#codecSettings.codec}`) },
        });

        this.#encoder.configure(this.#codecSettings);

        const video = document.createElement('video');

        switch (type) {
            case "webcam":
                video.srcObject = await navigator.mediaDevices.getUserMedia({ video: true });
                break;
            case "display":
                video.srcObject = await navigator.mediaDevices.getDisplayMedia(this.#displayMediaOptions);
                break;
        }

        const videoPlayback = document.getElementById('videoPlayback')
        videoPlayback.innerText = `Loopback : ${streamName} (${this.#user.id})`;
        videoPlayback.appendChild(video);

        await video.play();

        if (window.MediaStreamTrackProcessor) {
            // Faster but not available everywhere
            const track = video.srcObject.getVideoTracks()[0];
            const processor = new MediaStreamTrackProcessor({ track });
            const reader = processor.readable.getReader();

            // Grab frame
            setInterval(async () => {
                const result = await reader.read();
                const frame = result.value;
                this.#encoder.encode(frame, { keyFrame: true });
                frame.close();
            }, 1000 / this.#codecSettings.framerate)
        }
        else {
            // Fallback
            async function frameFromVideoElement(vid) {
                // Preferred: directly construct VideoFrame from video (if supported)
                try {
                    return new VideoFrame(vid, { timestamp: performance.now() * 1000 }); // timestamp in microseconds is allowed but not required
                } catch (e) {
                    // Not supported: fallback to canvas -> ImageBitmap -> VideoFrame
                }

                // Use OffscreenCanvas if available (works better in worker)
                const canvas = ('OffscreenCanvas' in window) ? new OffscreenCanvas(width, height) : document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(vid, 0, 0, width, height);
                // create ImageBitmap (fast) then VideoFrame
                const bitmap = await createImageBitmap(canvas);
                const vf = new VideoFrame(bitmap, { timestamp: performance.now() * 1000 });
                bitmap.close();
                return vf;
            }

            // Grab frame
            setInterval(async () => {
                const vf = await frameFromVideoElement(video);
                this.#encoder.encode(vf, { keyFrame: true });
                vf.close();
            }, 1000 / this.#codecSettings.framerate)
        }

        // Socket states
        this.#socket.onclose = async () => { };
        this.#socket.onerror = async (e) => { console.error('Stream : WebSocket error:', e) };

        this.#state = Stream.OPEN;
    }

    stop() {

    }

    async join(userId, streamName) {
        if (userId && streamName) {
            const isSupported = await VideoDecoder.isConfigSupported(this.#codecSettings);

            if (isSupported.supported) {
                // Create WebSocket
                this.#socket = new WebSocket(`${this.#streamUrl}/${userId}/${streamName}`, ["Bearer." + this.#token]);
                this.#socket.binaryType = "arraybuffer";
                this.#socket.onmessage = (message) => { console.debug('New frame received : ' + Date.now()); this.#receivePacket(message.data, this.#packetDecoder.decode) };

                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                const videoRemote = document.getElementById('videoRemote');

                videoRemote.innerText = `Remote : ${streamName} (${userId})`;
                videoRemote.appendChild(canvas);

                this.#decoder = new VideoDecoder({
                    output: (frame) => {
                        console.debug('New frame decode : ' + Date.now());
                        canvas.width = frame.codedWidth;
                        canvas.height = frame.codedHeight;
                        ctx.drawImage(frame, 0, 0);
                        canvas.src = canvas.toDataURL();
                        frame.close();
                    },
                    error: (error) => { throw new Error(`VideoDecoder error:\n${error.name}\nCurrent codec :${this.#codecSettings.codec}`) }
                });

                return true;
            }
            return false;
        }
    }

    leave() {

    }

    async #receivePacket(packet, packetDecode) {
        const result = packetDecode(packet);
        const header = result.header;
        const data = result.data;

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
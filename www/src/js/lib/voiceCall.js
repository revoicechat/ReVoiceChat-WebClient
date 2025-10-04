class VoiceCall {
    static CLOSE = 0;
    static CONNECTING = 1;
    static OPEN = 2;

    #codecSettings = {
        codec: "opus",
        sampleRate: 48_000, // 48kHz
        numberOfChannels: 1, // Mono
        bitrate: 64_000, // 64kbits
        bitrateMode: "variable",
        opus: {
            application: "voip",
            complexity: 9,
            signal: "voice",
            usedtx: true,
            frameDuration: 20_000, //20ms
            useinbanddec: true,
        },
    }
    #socket;
    #encoder;
    #audioCollector;
    #audioContext;
    #audioTimestamp = 0;
    #compressorNode;
    #buffer = [];
    #bufferMaxLength = 960; // 48000Hz × 0.020 sec = 960 samples (should be compute from sample rate and frame duration)
    #gainNode;
    #gateNode;
    #users = {};
    #state = 0;
    #muted = false;

    usersSettings = {};

    async open(voiceUrl, roomId, token) {
        this.#state = VoiceCall.CONNECTING;

        // Create WebSocket
        this.#socket = new WebSocket(`${voiceUrl}/${roomId}?token=${token}`);
        this.#socket.binaryType = "arraybuffer";

        // Setup encoder and transmitter
        await this.#encodeAndTransmit();

        // Setup receiver and decoder
        this.#socket.onmessage = (message) => { this.#receiveAndDecode(message, this.#packetDecode) };

        // Socket states
        this.#socket.onopen = () => { console.debug('VoiceCall : WebSocket open') };
        this.#socket.onclose = async () => { console.debug('VoiceCall : WebSocket closed') };
        this.#socket.onerror = async (e) => { await this.close(); console.error('VoiceCall : WebSocket error:', e) };

        this.#state = VoiceCall.OPEN;
    }

    async close() {
        // Close WebSocket
        if (this.#socket !== null) {
            this.#socket.close();
        }

        // Flush and close all decoders
        console.log(this.#users)
        for (const [, user] of Object.entries(this.#users)) {
            if (user?.decoder && user.decoder.state === 'configured') {
                await user.decoder.flush();
                await user.decoder.close();
            }
        }

        // Close self encoder
        if (this.#encoder) {
            this.#encoder.close();
        }

        // Close audioContext
        if (this.#audioContext) {
            this.#audioContext.close();
        }

        this.#state = VoiceCall.CLOSE;
    }

    getState() {
        return this.#state;
    }

    async addUser(userId) {
        if (userId && this.#users[userId] === undefined && this.#socket !== null && this.#socket.readyState === WebSocket.OPEN) {
            console.debug("Creating decoder for user:", userId);

            const isSupported = await AudioDecoder.isConfigSupported(this.#codecSettings);
            if (isSupported.supported) {
                this.#users[userId] = { decoder: null, playhead: 0, muted: false, gainNode: null, source: null };

                if (!this.usersSettings[userId]) {
                    this.usersSettings[userId] = { muted: false, volume: 1 };
                }

                this.#users[userId].decoder = new AudioDecoder({
                    output: (chunk) => { decoderCallback(chunk, this.#audioContext, this.#users) },
                    error: (error) => { throw Error(`Decoder setup failed:\n${error}\nCurrent codec :${this.#codecSettings}`) },
                });

                this.#users[userId].decoder.configure(this.#codecSettings)
                this.#users[userId].playhead = 0;
                this.#users[userId].gainNode = this.#audioContext.createGain();
            }

            function decoderCallback(audioData, audioContext, users) {
                const buffer = audioContext.createBuffer(
                    audioData.numberOfChannels,
                    audioData.numberOfFrames,
                    audioData.sampleRate
                );

                const channelData = new Float32Array(audioData.numberOfFrames);
                audioData.copyTo(channelData, { planeIndex: 0 });
                buffer.copyToChannel(channelData, 0);

                // Play the AudioBuffer
                const source = audioContext.createBufferSource();
                source.buffer = buffer;

                source.connect(users[userId].gainNode); // connect audio source to gain
                users[userId].gainNode.connect(audioContext.destination); // connect gain to output

                users[userId].playhead = Math.max(users[userId].playhead, audioContext.currentTime) + buffer.duration;
                source.start(users[userId].playhead);
                audioData.close();
            }

            return true;
        }
        return false;
    }

    async removeUser(userId) {
        if (userId && this.#socket !== null && this.#socket.readyState === WebSocket.OPEN) {
            const user = this.#users[userId];
            await user.decoder.flush();
            await user.decoder.close();
            this.#users[userId] = null;
        }
    }

    toggleUserMute(userId) {
        this.#users[userId].muted = !this.#users[userId].muted;
        this.usersSettings[userId].muted = this.#users[userId].muted;
    }

    setUserMute(userId, muted) {
        this.#users[userId].muted = muted;
    }

    getUserMute(userId) {
        return this.#users[userId].muted;
    }

    setUserVolume(userId, volume) {
        

        this.usersSettings[userId].volume = volume;

        const userGainNode = this.#users[userId].gainNode;
        if (userGainNode) {
            userGainNode.gain.setValueAtTime(volume, this.#audioContext.currentTime);
        }
    }

    getUserVolume(userId) {
        if (this.usersSettings[userId] === undefined) {
            return 1;
        }

        return this.usersSettings[userId].volume;
    }

    toggleSelfMute() {
        this.#muted = !this.#muted;
    }

    setSelfMute(muted) {
        this.#muted = muted;
    }

    getSelfMute() {
        return this.#muted;
    }

    setSelfVolume(volume) {
        if (this.#gainNode) {
            this.#gainNode.gain.setValueAtTime(volume, this.#audioContext.currentTime);
        }
    }

    getSelfVolume() {
        return this.#gainNode.gain;
    }


    #packetEncode(header, data) {
        const headerBytes = new TextEncoder().encode(header);

        // Calculate length of packet
        const packetLength = 2 + headerBytes.length + data.byteLength;

        // Create packet of that length
        const packet = new Uint8Array(packetLength);

        // Fill packet
        const view = new DataView(packet.buffer);
        view.setUint16(0, headerBytes.length);
        packet.set(headerBytes, 2);
        packet.set(new Uint8Array(data), 2 + headerBytes.length);

        return packet;
    }

    #packetDecode(packet) {
        const data = packet.data;
        const view = new DataView(data);

        const headerEnd = 2 + view.getUint16(0);
        const headerBytes = new Uint8Array(data.slice(2, headerEnd));
        const headerJSON = new TextDecoder().decode(headerBytes);

        const result = { header: null, data: null };
        result.header = JSON.parse(headerJSON);
        result.data = data.slice(headerEnd);

        return result;
    }

    async #encodeAndTransmit() {
        const supported = await AudioEncoder.isConfigSupported(this.#codecSettings);
        if (!supported.supported) {
            throw new Error("Encoder Codec not supported");
        }

        // Setup Encoder
        this.#encoder = new AudioEncoder({
            output: (chunk) => { encoderCallback(chunk, this.#audioTimestamp, this.#socket, this.#packetEncode); },
            error: (error) => { throw Error(`Encoder setup failed:\n${error}\nCurrent codec :${this.#codecSettings}`) },
        });

        this.#encoder.configure(this.#codecSettings)

        // Init AudioContext
        this.#audioContext = new AudioContext({ sampleRate: this.#codecSettings.sampleRate });
        await this.#audioContext.audioWorklet.addModule('src/js/lib/voiceProcessor.js');

        // Init Mic capture
        const micSource = this.#audioContext.createMediaStreamSource(await navigator.mediaDevices.getUserMedia({ audio: true }));

        // Create Gain node
        this.#gainNode = this.#audioContext.createGain();
        this.#gainNode.gain.setValueAtTime(1, this.#audioContext.currentTime);

        // Create AudioCollector
        this.#audioCollector = new AudioWorkletNode(this.#audioContext, "AudioCollector");

        // Create NoiseGate (with default parameters)
        this.#gateNode = new AudioWorkletNode(this.#audioContext, "NoiseGate", {
            parameterData: {
                attack: 0.01,
                release: 0.4,
                threshold: -45
            }
        });

        // Create compressorNode Node (with default parameters)
        this.#compressorNode = this.#audioContext.createDynamicsCompressor();
        this.#compressorNode.attack.setValueAtTime(0, this.#audioContext.currentTime);
        this.#compressorNode.knee.setValueAtTime(40, this.#audioContext.currentTime);
        this.#compressorNode.ratio.setValueAtTime(12, this.#audioContext.currentTime);
        this.#compressorNode.release.setValueAtTime(0, this.#audioContext.currentTime);
        this.#compressorNode.threshold.setValueAtTime(-50, this.#audioContext.currentTime);

        // Connect microphone to gain
        micSource.connect(this.#gainNode);

        // Connect gain to gate
        this.#gainNode.connect(this.#gateNode)

        // Connect gate to compressor
        this.#gateNode.connect(this.#compressorNode);

        // Connect compressor to audioCollector
        this.#compressorNode.connect(this.#audioCollector);

        this.#audioCollector.port.onmessage = (event) => {
            // We don't do anything if we are self muted
            if (this.#muted) {
                return;
            }

            const samples = event.data;

            // Push samples to buffer
            this.#buffer.push(...samples);

            // While buffer is full
            while (this.#buffer.length >= this.#bufferMaxLength) {
                // Get 1 audio frames
                const frame = this.#buffer.slice(0, 960);

                // Remove this frame from buffer
                this.#buffer = this.#buffer.slice(960);

                // Create audioData object to feed encoder
                const audioData = new AudioData({
                    format: "f32-planar",
                    sampleRate: this.#codecSettings.sampleRate,
                    numberOfFrames: frame.length,
                    numberOfChannels: 1,
                    timestamp: this.#audioTimestamp,
                    data: new Float32Array(frame).buffer
                });

                // Feed encoder
                if (this.#encoder !== null && this.#encoder.state === "configured") {
                    this.#encoder.encode(audioData);
                }

                audioData.close();

                // Update audioTimestamp (add 20ms / 20000µs)
                this.#audioTimestamp += 20_000;
            }
        }

        function encoderCallback(audioChunk, audioTimestamp, socket, packetEncode) {
            // Get a copy of audioChunk and audioTimestamp
            const audioChunkCopy = new ArrayBuffer(audioChunk.byteLength);
            audioChunk.copyTo(audioChunkCopy);

            // Create Header to send with audioChunk
            const header = JSON.stringify({
                timestamp: Date.now(),
                audioTimestamp: audioTimestamp / 1000, // audioTimestamp is in µs but sending ms is enough
                user: global.user.id,
            })

            const packet = packetEncode(header, audioChunkCopy);

            // Finally send it ! (but socket need to be open)
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(packet);
            }
        }
    }

    #receiveAndDecode(packet, packetDecode) {
        const result = packetDecode(packet);
        const header = result.header;
        const data = result.data;

        if (this.#users[header.user]) {
            const currentUser = this.#users[header.user];
            // If user sending packet is muted, we stop
            if (currentUser.muted) {
                return;
            }

            // Decode and read audio
            const audioChunk = new EncodedAudioChunk({
                type: "key",
                timestamp: header.audioTimestamp * 1000,
                data: new Uint8Array(data),
            })

            if (currentUser.decoder !== null && currentUser.decoder.state === "configured") {
                currentUser.decoder.decode(audioChunk);
            }
        }
    }
}

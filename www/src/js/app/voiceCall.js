import { EncodedPacket, DecodedPacket } from "./packet.js";

export default class VoiceCall {
    "use strict";

    static CLOSE = 0;
    static CONNECTING = 1;
    static OPEN = 2;
    static DEFAULT_SETTINGS = {
        compressor: {
            enabled: true,
            attack: 0,
            knee: 40,
            ratio: 12,
            release: 0.25,
            reduction: 0,
            threshold: -50,
        },
        gate: {
            attack: 0.01,
            release: 0.4,
            threshold: -60,
        },
        self: {
            muted: false,
            deaf: false,
            volume: 1,
        },
        users: {}
    }

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
    #user;
    #users = {};
    #state = 0;
    #settings = {};
    #gateState = false;
    #outputGain;
    #setUserGlow;
    #setSelfGlow;

    constructor(user) {
        if (!user) {
            throw new Error('user is null or undefined');
        }

        this.#user = user;

        if (user.settings) {
            this.#settings = user.settings.voice;
        }
        else {
            this.#settings = DEFAULT_SETTINGS;
        }
    }

    async open(voiceUrl, roomId, token, setUserGlow, setSelfGlow) {
        if (!voiceUrl) {
            throw new Error('VoiceUrl is null or undefined');
        }

        if (!roomId) {
            throw new Error('roomId is null or undefined');
        }

        if (!token) {
            throw new Error('token is null or undefined');
        }

        this.#state = VoiceCall.CONNECTING;

        this.#setUserGlow = setUserGlow;
        this.#setSelfGlow = setSelfGlow;

        // Create WebSocket
        this.#socket = new WebSocket(`${voiceUrl}/${roomId}`, ["Bearer." + token]);
        this.#socket.binaryType = "arraybuffer";

        // Setup encoder and transmitter
        await this.#encodeAudio();

        // Setup receiver and decoder
        this.#socket.onmessage = (message) => { this.#decodeAudio(new DecodedPacket(message.data)) }

        // Setup main output gain
        this.#outputGain = this.#audioContext.createGain();
        this.#outputGain.gain.setValueAtTime(this.#user.settings.getVoiceVolume(), this.#audioContext.currentTime);

        // Socket states
        this.#socket.onclose = async () => { await this.close(); };
        this.#socket.onerror = async (e) => { await this.close(); console.error('VoiceCall : WebSocket error:', e) };

        this.#state = VoiceCall.OPEN;
    }

    async close() {
        this.#state = VoiceCall.CLOSE;

        // Close WebSocket
        if (this.#socket && (this.#socket.readyState === WebSocket.OPEN || this.#socket.readyState === WebSocket.CONNECTING)) {
            await this.#socket.close();
            this.#socket = null;
        }

        // Close self encoder
        if (this.#encoder && this.#encoder.state !== "closed") {
            this.#encoder.close();
            this.#encoder = null;
        }

        // Close audioContext
        if (this.#audioContext && this.#audioContext.state !== "closed") {
            this.#audioContext.close();
            this.#audioContext = null;
        }

        // For all users
        for (const [userId, user] of Object.entries(this.#users)) {
            // Flush and close all decoders
            if (user?.decoder && user.decoder.state === 'configured') {
                try {
                    await user.decoder.flush();
                    await user.decoder.close();

                }
                catch (error) {
                    console.error(error);
                }

                user.decoder = null;
            }
            // Remove glow
            this.#setUserGlow(userId, false);
        }

        this.#setSelfGlow(false);
    }

    getState() {
        return this.#state;
    }

    getSettings() {
        return this.#settings;
    }

    async addUser(userId) {
        if (userId && !this.#users[userId] && this.#socket && this.#socket.readyState === WebSocket.OPEN) {
            await this.#createUserDecoder(userId);
        }
    }

    async removeUser(userId) {
        if (userId) {
            const user = this.#users[userId];
            await user.decoder.flush();
            await user.decoder.close();
            this.#users[userId] = null;
        }
    }

    async setUserMute(userId, enabled) {
        if (this.#users[userId]) {
            this.#users[userId].muted = enabled;
        }
    }

    async updateUserMute(userId) {
        if (this.#settings.users[userId]) {
            this.#users[userId].muted = this.#settings.users[userId].muted;
        }
    }

    updateUserVolume(userId) {
        if (this.#settings.users[userId]) {
            if (this.#users[userId]) {
                const userGainNode = this.#users[userId].gainNode;
                if (userGainNode) {
                    userGainNode.gain.setValueAtTime(this.#settings.users[userId].volume, this.#audioContext.currentTime);
                }
            }
        }
    }

    async toggleSelfMute() {
        // Need to be async !
        this.#settings.self.muted = !this.#settings.self.muted;
    }

    async setSelfMute(muted) {
        // Need to be async !
        this.#settings.self.muted = muted;
    }

    async getSelfMute() {
        // Need to be async !
        return this.#settings.self.muted;
    }

    async toggleSelfDeaf() {
        // Need to be async !
        this.#settings.self.deaf = !this.#settings.self.deaf;
    }

    async setSelfDeaf(deaf) {
        // Need to be async !
        this.#settings.self.deaf = deaf;
    }

    async getSelfDeaf() {
        // Need to be async !
        return this.#settings.self.deaf;
    }

    setSelfVolume(volume) {
        this.#settings.self.volume = volume;

        if (this.#gainNode) {
            this.#gainNode.gain.setValueAtTime(volume, this.#audioContext.currentTime);
        }
    }

    getSelfVolume() {
        if (this.#gainNode) {
            return this.#gainNode.gain;
        }
    }

    setGate(gateSettings) {
        this.#settings.gate = gateSettings;
        this.#gateNode.parameters.get("attack").setValueAtTime(this.#settings.gate.attack, this.#audioContext.currentTime);
        this.#gateNode.parameters.get("release").setValueAtTime(this.#settings.gate.release, this.#audioContext.currentTime);
        this.#gateNode.parameters.get("threshold").setValueAtTime(this.#settings.gate.threshold, this.#audioContext.currentTime);
    }

    setOutputVolume(volume) {
        if (this.#outputGain) {
            this.#outputGain.gain.setValueAtTime(volume, this.#audioContext.currentTime);
        }
    }

    setCompressor(compressorSetting) {
        this.#settings.compressor = compressorSetting;

        if (this.#compressorNode) {
            this.#compressorNode.attack.setValueAtTime(this.#settings.compressor.attack, this.#audioContext.currentTime);
            this.#compressorNode.knee.setValueAtTime(this.#settings.compressor.knee, this.#audioContext.currentTime);
            this.#compressorNode.ratio.setValueAtTime(this.#settings.compressor.ratio, this.#audioContext.currentTime);
            this.#compressorNode.release.setValueAtTime(this.#settings.compressor.release, this.#audioContext.currentTime);
            this.#compressorNode.threshold.setValueAtTime(this.#settings.compressor.threshold, this.#audioContext.currentTime);
        }
    }

    async #encodeAudio() {
        const supported = await AudioEncoder.isConfigSupported(this.#codecSettings);
        if (!supported.supported) {
            throw new Error("Encoder Codec not supported");
        }

        // Setup Encoder
        this.#encoder = new AudioEncoder({
            output: (chunk) => {
                const header = {
                    timestamp: Date.now(),
                    audioTimestamp: this.#audioTimestamp / 1000, // audioTimestamp is in µs but sending ms is enough
                    user: this.#user.id,
                    gateState: this.#gateState,
                }
                if (this.#socket.readyState === WebSocket.OPEN) {
                    this.#socket.send(new EncodedPacket(header, chunk).data);
                }
            },
            error: (error) => { throw new Error(`Encoder setup failed:\n${error.name}\nCurrent codec :${this.#codecSettings.codec}`) },
        });

        this.#encoder.configure(this.#codecSettings)

        // Init AudioContext
        this.#audioContext = new AudioContext({ sampleRate: this.#codecSettings.sampleRate });
        await this.#audioContext.audioWorklet.addModule('src/js/app/voiceProcessor.js');

        /**
         * Audio routing 
         * microphone -> gainNode -> gateNode -> compressorNode (optional) -> collector -> buffer -> encoder -> send
         */

        // Init Mic capture
        const micSource = this.#audioContext.createMediaStreamSource(await navigator.mediaDevices.getUserMedia({ audio: true }));

        // Create Gain node
        this.#gainNode = this.#audioContext.createGain();
        this.#gainNode.gain.setValueAtTime(this.#settings.self.volume, this.#audioContext.currentTime);

        // Connect microphone to gain
        micSource.connect(this.#gainNode);

        // Create Gate
        this.#gateNode = new AudioWorkletNode(this.#audioContext, "NoiseGate", {
            parameterData: {
                attack: this.#settings.gate.attack,
                release: this.#settings.gate.release,
                threshold: this.#settings.gate.threshold
            }
        });

        this.#gateNode.port.onmessage = (event) => {
            const state = event.data.open
            this.#gateState = state;

            if (this.#settings.self.muted) {
                this.#setUserGlow(this.#user.id, false);
                this.#setSelfGlow(false);
            } else {
                this.#setUserGlow(this.#user.id, state);
                this.#setSelfGlow(state);
            }
        }

        // Connect gain to gate
        this.#gainNode.connect(this.#gateNode);

        // Create AudioCollector
        this.#audioCollector = new AudioWorkletNode(this.#audioContext, "AudioCollector", {
            channelCount: 1,
            channelCountMode: "explicit",
            channelInterpretation: "speakers"
        });

        // Create compressor if enabled
        if (this.#settings.compressor.enabled) {
            this.#compressorNode = this.#audioContext.createDynamicsCompressor();
            this.#compressorNode.attack.setValueAtTime(this.#settings.compressor.attack, this.#audioContext.currentTime);
            this.#compressorNode.knee.setValueAtTime(this.#settings.compressor.knee, this.#audioContext.currentTime);
            this.#compressorNode.ratio.setValueAtTime(this.#settings.compressor.ratio, this.#audioContext.currentTime);
            this.#compressorNode.release.setValueAtTime(this.#settings.compressor.release, this.#audioContext.currentTime);
            this.#compressorNode.threshold.setValueAtTime(this.#settings.compressor.threshold, this.#audioContext.currentTime);

            // Connect gate to compressor
            this.#gateNode.connect(this.#compressorNode);

            // Connect compressor to audioCollector
            this.#compressorNode.connect(this.#audioCollector);
        } else {
            // Connect gate to audioCollector (i.e. bypass compressor)
            this.#gateNode.connect(this.#audioCollector);
        }

        this.#audioCollector.port.onmessage = (event) => {
            // We don't do anything if we are self muted
            if (this.#settings.self.muted) {
                return;
            }

            const samples = event.data;

            if (!samples || samples.some(v => isNaN(v))) {
                console.warn("Invalid samples", samples);
            }

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
                else {
                    console.error("Self has no encoder");
                }

                audioData.close();

                // Update audioTimestamp (add 20ms / 20000µs)
                this.#audioTimestamp += 20_000;
            }
        }
    }

    #decodeAudio(decodedPacket) {
        const header = decodedPacket.header;
        const data = decodedPacket.data;

        if (this.#users[header.user]) {
            const currentUser = this.#users[header.user];
            // If user sending packet is muted OR we are deaf, we stop
            if (currentUser.muted || this.#settings.self.deaf) {
                this.#setUserGlow(header.user, false);
                return;
            }

            // User gate open/close
            this.#setUserGlow(header.user, header.gateState);

            // Decode and read audio
            const audioChunk = new EncodedAudioChunk({
                type: "key",
                timestamp: header.audioTimestamp * 1000,
                data: new Uint8Array(data),
            })

            if (currentUser.decoder !== null && currentUser.decoder.state === "configured") {
                currentUser.decoder.decode(audioChunk);
            } else {
                console.error(`User '${header.user}' has no decoder`);
            }
        }
    }

    async #createUserDecoder(userId) {
        const isSupported = await AudioDecoder.isConfigSupported(this.#codecSettings);
        if (isSupported.supported) {
            this.#users[userId] = { decoder: null, playhead: 0, muted: false, gainNode: null, source: null };

            if (this.#settings.users[userId]) {
                this.#users[userId].muted = this.#settings.users[userId].muted;
            }
            else {
                this.#settings.users[userId] = { muted: false, volume: 1 };
            }

            this.#users[userId].gainNode = this.#audioContext.createGain();
            this.#users[userId].gainNode.gain.setValueAtTime(this.#settings.users[userId].volume, this.#audioContext.currentTime);

            this.#users[userId].decoder = new AudioDecoder({
                output: (chunk) => { this.#playbackAudio(chunk, this.#audioContext, this.#users, userId) },
                error: (error) => { throw new Error(`Decoder setup failed:\n${error.name}\nCurrent codec :${this.#codecSettings.codec}`) },
            });
            this.#users[userId].decoder.configure(this.#codecSettings);

            this.#users[userId].playhead = 0;
        }
    }

    #playbackAudio(audioData, audioContext, users, userId) {
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
        users[userId].gainNode.connect(this.#outputGain); // connect user gain to main gain
        this.#outputGain.connect(audioContext.destination); // connect main gain to output

        users[userId].playhead = Math.max(users[userId].playhead, audioContext.currentTime) + buffer.duration;
        source.start(users[userId].playhead);
        audioData.close();
    }
}
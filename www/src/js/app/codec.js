export default class Codec {
    static DEFAULT_VOICE_USER = {
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

    static DEFAULT_VOICE_MUSIC = {
        codec: "opus",
        sampleRate: 48000,
        numberOfChannels: 2,
        bitrate: 128_000,
        bitrateMode: "variable",
        opus: {
            application: "audio",
            complexity: 10,
            signal: "music",
            usedtx: true,
            frameDuration: 20_000, //20ms
            useinbanddec: true,
        }
    }

    static STREAM_AUDIO = {
        codec: "opus",
        sampleRate: 48000,
        numberOfChannels: 2,
        bitrate: 128_000,
        bitrateMode: "variable",
        opus: {
            application: "audio",
            complexity: 10,
            signal: "music",
            usedtx: true,
            frameDuration: 20_000, //20ms
            useinbanddec: true,
        }
    }

    static VIDEO_CODEC = {
        VP8: "vp8",
        VP9: "vp09.00.10.08",
        AV1: "av01.0.04M.08"
    }

    static async webcamConfig() {
        const config = {
            codec: Codec.VIDEO_CODEC.AV1,
            framerate: 30,
            width: 1920,
            height: 1080,
            bitrate: 3_000_000,
            latencyMode: "realtime",
        }

        // First fallback
        if (!(await VideoEncoder.isConfigSupported(config)).supported) {
            config.codec = Codec.VIDEO_CODEC.VP9;
        }

        // Second fallback
        if (!(await VideoEncoder.isConfigSupported(config)).supported) {
            config.codec = Codec.VIDEO_CODEC.VP8;
        }

        return config;
    }

    static async streamConfig(inputResolution, inputFps, inputCodec) {
        const resolution = {
            HD: {
                width: 1280,
                height: 720,
                bitrate: 3_000_000
            },
            FHD: {
                width: 1920,
                height: 1080,
                bitrate: 4_000_000
            },
            QHD: {
                width: 2560,
                height: 1440,
                bitrate: 6_000_000
            },
            UHD: {
                width: 3840,
                height: 2160,
                bitrate: 10_000_000
            }
        }

        let config = {
            codec: null,
            framerate: null,
            width: null,
            height: null,
            bitrate: null,
            latencyMode: "realtime",
        }

        config.width = resolution[inputResolution].width;
        config.height = resolution[inputResolution].height;
        config.bitrate = resolution[inputResolution].bitrate;
        config.framerate = inputFps;

        if (inputCodec === "AUTO") {
            config.codec = Codec.VIDEO_CODEC.AV1;
        }
        else {
            config.codec = Codec.VIDEO_CODEC[inputCodec];
        }

        // First fallback
        if (!(await VideoEncoder.isConfigSupported(config)).supported) {
            config.codec = Codec.VIDEO_CODEC.VP9;
        }

        // Second fallback
        if (!(await VideoEncoder.isConfigSupported(config)).supported) {
            config.codec = Codec.VIDEO_CODEC.VP8;
        }

        return config;
    }
}
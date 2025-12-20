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

    static DEFAULT_STREAM_AUDIO = {
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

    static DEFAULT_STREAM_VIDEO = {
        codec: "vp8",
        framerate: 30,
        width: 1280,
        height: 720,
        bitrate: 3_000_000,
        latencyMode: "realtime",
    }
}
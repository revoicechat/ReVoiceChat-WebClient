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

    // 720p30 2Mbits VP9
    static STREAM_VIDEO_DEFAULT = {
        codec: "vp09.00.10.08",
        framerate: 30,
        width: 1280,
        height: 720,
        bitrate: 2_000_000,
        latencyMode: "realtime",
    }

    // 1080p15 3Mbits VP9
    static STREAM_VIDEO_FHD_30_VP9 = {
        codec: "vp09.00.10.08",
        framerate: 5,
        width: 1920,
        height: 1080,
        bitrate: 3_000_000,
        latencyMode: "realtime",
    }

    // 1080p30 4Mbits VP9
    static STREAM_VIDEO_FHD_30_VP9 = {
        codec: "vp09.00.10.08",
        framerate: 30,
        width: 1920,
        height: 1080,
        bitrate: 3_000_000,
        latencyMode: "realtime",
    }

    // 1080p60 4Mbits VP9
    static STREAM_VIDEO_FHD_30_VP9 = {
        codec: "vp09.00.10.08",
        framerate: 60,
        width: 1920,
        height: 1080,
        bitrate: 4_000_000,
        latencyMode: "realtime",
    }

    // 1080p60 4Mbits AV1
    static STREAM_VIDEO_FHD_60_AV1 = {
        codec: "av01.0.04M.08",
        framerate: 60,
        width: 1920,
        height: 1080,
        bitrate: 4_000_000,
        latencyMode: "realtime",
    }

    // 1440p60 4Mbits AV1
    static STREAM_VIDEO_QHD_60_AV1 = {
        codec: "av01.0.04M.08",
        framerate: 60,
        width: 2560,
        height: 1440,
        bitrate: 4_000_000,
        latencyMode: "realtime",
    }

    // 2160p60 6Mbits AV1
    static STREAM_VIDEO_UHD_60_AV1 = {
        codec: "av01.0.04M.08",
        framerate: 60,
        width: 3840,
        height: 2160,
        bitrate: 6_000_000,
        latencyMode: "realtime",
    }
}
const global = {
    sse: null,
    jwtToken: null,
    url: {
        core: null,
        media: null,
        voice: null,
        voiceSignal: null,
        voiceStun: null,
    },
    server: {
        id: null,
        name: null,
    },
    room: {
        id: null,
        name: null,
        type: null,
    },
    user: {
        id: null,
        displayName: null,
    },
    chat: {
        mode: "send",
        editId: null,
        emojisGlobal: []
    }
}

// Ready state
document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.setAttribute("data-theme", localStorage.getItem("Theme") || "dark");

    // Login
    if (sessionStorage.getItem('url.core')) {
        global.url.core = sessionStorage.getItem(('url.core'));

        const core = new URL(global.url.core);
        console.info(`CORE : ${core.host}`);

        global.url.media = `${core.protocol}//${core.host}/media`;
        global.url.voice = `${core.protocol}//${core.host}/api/voice`;

        global.jwtToken = getCookie("jwtToken");
    }

    // Last state (app wasn't closed)
    if (sessionStorage.getItem('lastState')) {
        const lastState = JSON.parse(sessionStorage.getItem('lastState'));
        global.url = lastState.url;
        global.server = lastState.server;
        global.room = lastState.room;
        global.user = lastState.user;
    }

    // No data
    if (global.url.core === null) {
        document.location.href = `index.html`;
    }

    // Current page is the app
    const currentLocation = window.location.pathname.substring(window.location.pathname.lastIndexOf("/"));
    if (currentLocation === "/app.html") {
        getServers();
        sseOpen();
        getUsername();
        getEmojisGlobal();
        loadUserSetting();
        router(getQueryVariable('r'));
    }
});

addEventListener("beforeunload", () => {
    sessionStorage.setItem('lastState', JSON.stringify(global));
    sseClose();
})

function saveUserSetting() {
    const settings = {
        voice: {
            selfVolume: voice.selfVolume,
            selfCompressor: voice.selfCompressor,
            selfMute: voice.selfMute,
            usersSetting : voice.usersSetting,
            compressorSetting : voice.compressorSetting,
        }
    }

    localStorage.setItem('userSettings', JSON.stringify(settings));
}

function loadUserSetting() {
    const rawSettings = localStorage.getItem('userSettings');

    const defaultCompressorSetting = {
        enabled: true,
        threshold: -50,
        knee: 40,
        ratio: 12,
        attack: 0,
        release: 0.25
    }

    if (rawSettings) {
        const settings = JSON.parse(rawSettings);
        voice.selfVolume = settings.voice.selfVolume;
        voice.selfCompressor = settings.voice.selfCompressor;
        voice.selfMute = settings.voice.selfMute;
        voice.usersSetting = settings.usersSetting ? settings.usersSetting : {};
        voice.compressorSetting = settings.compressorSetting ? settings.compressorSetting : defaultCompressorSetting;
    }
}
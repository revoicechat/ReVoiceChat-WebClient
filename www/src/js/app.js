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
        emojisGlobal: [],
        attachmentMaxSize: 0,
    }
}

// Ready state
document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.dataset.theme = localStorage.getItem("Theme") || "dark";

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
        getAttachmentMaxSize();
        getEmojisGlobal();
        appLoadSettings();
        getServers();
        sseOpen();
        getUsername();
        router(getQueryVariable('r'));
    }
});

addEventListener("beforeunload", () => {
    sessionStorage.setItem('lastState', JSON.stringify(global));
    sseClose();
})

function appSaveSettings() {
    const settings = {
        voice: voice.settings,
    }

    localStorage.setItem('userSettings', JSON.stringify(settings));
}

function appLoadSettings() {
    const settings = JSON.parse(localStorage.getItem('userSettings'));

    const defaultVoice = VoiceCall.DEFAULT_SETTINGS;

    // Apply settings
    if (settings) {
        voice.settings.self = settings.voice.self ? settings.voice.self : defaultVoice.self;
        voice.settings.users = settings.voice.users ? settings.voice.users : {};
        voice.settings.compressor = settings.voice.compressor ? settings.voice.compressor : defaultVoice.compressor;
        voice.settings.gate = settings.voice.gate ? settings.voice.gate : defaultVoice.gate;
    }
    else {
        voice.settings = defaultVoice;
    }
}
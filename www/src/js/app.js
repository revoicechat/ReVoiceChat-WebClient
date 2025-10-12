const RVC = new ReVoiceChat();
const RVCS = new ReVoiceChatServer(RVC);
const RVC_User = new ReVoiceChatUser(RVC);

const global = {
    url: {
        voiceSignal: null,
        voiceStun: null,
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

    // Current page is the app
    const currentLocation = window.location.pathname.substring(window.location.pathname.lastIndexOf("/"));
    if (currentLocation === "/app.html") {
        getAttachmentMaxSize();
        getEmojisGlobal();
        appLoadSettings();

        RVC.openSSE();
        RVC.router.routeTo(getQueryVariable('r'));
    }
});

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
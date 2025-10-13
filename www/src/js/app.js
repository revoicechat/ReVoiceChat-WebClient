const RVC = new ReVoiceChat();

const global = {
    url: {
        voiceSignal: null,
        voiceStun: null,
    },
    chat: {
        emojisGlobal: []
    }
}

// Ready state
document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.dataset.theme = localStorage.getItem("Theme") || "dark";

    getEmojisGlobal();

    RVC.state.load();
    RVC.openSSE();
    RVC.router.routeTo(getQueryVariable('r'));
    RVC.user.loadSettings();
});

const RVC = new ReVoiceChat();

const global = {
    url: {
        voiceSignal: null,
        voiceStun: null,
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

    getAttachmentMaxSize();
    getEmojisGlobal();

    RVC.restoreState();
    RVC.openSSE();
    RVC.router.routeTo(getQueryVariable('r'));

    RVC.user.loadSettings();
});

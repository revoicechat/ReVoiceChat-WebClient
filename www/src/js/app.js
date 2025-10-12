const RVC = new ReVoiceChat();
const RVC_User = new ReVoiceChatUser(RVC);

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

    RVC.openSSE();
    RVC.router.routeTo(getQueryVariable('r'));

    RVC_User.loadSettings();
});

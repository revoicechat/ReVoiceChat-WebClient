import ReVoiceChat from './app/revoicechat.js';

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

// Event listener
document.getElementById("text-input").addEventListener('keydown', async function (e) {
    if (e.key === 'Enter') {
        if (e.shiftKey) {
            return;
        }
        e.preventDefault();
        await RVC.room.textController.send();
        return;
    }

    if (e.key === 'Escape') {
        document.getElementById("text-input").value = "";
        RVC.room.textController.mode = "send";
    }
});

export { RVC, global };
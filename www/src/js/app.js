import ReVoiceChat from './app/revoicechat.js';
import RoomTextController from './app/roomTextController.js';

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

// Attach to window (need improvement)
window.global = global;
window.RVC = RVC;

// Ready state
document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.dataset.theme = localStorage.getItem("Theme") || "dark";

    RVC.user.settings.load();
    RVC.state.load();
    RVC.openSSE();
    RVC.router.routeTo(getQueryVariable('r'));
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
        RVC.room.textController.mode = RoomTextController.MODE_SEND;
    }
});
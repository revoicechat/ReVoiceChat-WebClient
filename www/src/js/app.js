import ReVoiceChat from './app/revoicechat.js';

const RVC = new ReVoiceChat();

// Attach RVC to window
window.RVC = RVC;

// Ready state
document.addEventListener('DOMContentLoaded', () => RVC.load());
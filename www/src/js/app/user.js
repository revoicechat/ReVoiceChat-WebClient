import VoiceCall from "./voiceCall.js";

export default class User {
    #fetcher;
    #mediaURL;
    id;
    displayName;
    voiceSettings = {
        compressor: {},
        gate: {},
        self: {},
        users: {},
    }

    constructor(fetcher, mediaURL) {
        this.#fetcher = fetcher;
        this.#mediaURL = mediaURL;
        this.#load();
    }

    async #load() {
        const result = await this.#fetcher.fetchCore(`/user/me`, 'GET');

        if (result !== null) {
            this.id = result.id;
            this.displayName = result.displayName;

            document.getElementById("status-container").classList.add(result.id);
            document.getElementById("user-name").innerText = result.displayName;
            document.getElementById("user-status").innerText = result.status;
            document.getElementById("user-dot").className = `user-dot ${statusToDotClassName(result.status)}`;
            document.getElementById("user-picture").src = `${this.#mediaURL}/profiles/${result.id}`;
        }
    }

    saveSettings() {
        const settings = {
            voice: this.voiceSettings,
        }

        localStorage.setItem('userSettings', JSON.stringify(settings));
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('userSettings'));

        const defaultVoice = VoiceCall.DEFAULT_SETTINGS;

        // Apply settings
        if (settings.voice) {
            this.voiceSettings.self = settings.voice.self ? settings.voice.self : defaultVoice.self;
            this.voiceSettings.users = settings.voice.users ? settings.voice.users : {};
            this.voiceSettings.compressor = settings.voice.compressor ? settings.voice.compressor : defaultVoice.compressor;
            this.voiceSettings.gate = settings.voice.gate ? settings.voice.gate : defaultVoice.gate;
        }
        else {
            this.voiceSettings = defaultVoice;
        }
    }

    update(data) {
        const id = data.id;
        for (const icon of document.querySelectorAll(`.${id} img.icon`)) {
            icon.src = `${this.#mediaURL}/profiles/${id}?t=${Date.now()}`;
        }
        for (const name of document.querySelectorAll(`.${id} .name`)) {
            name.innerText = data.displayName;
        }
    }
}
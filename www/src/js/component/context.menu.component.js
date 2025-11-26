
class VoiceContextMenu extends HTMLElement {
    #voiceCall;
    #voiceController;
    #userSettings;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <link href="src/css/main.css" rel="stylesheet" />
            <link href="src/css/themes.css" rel="stylesheet" />
            <link href="src/js/component/context.menu.css" rel="stylesheet" />

            <div class="menu">
                <div class="item slider" id="volume-block">
                    <label id="volume-label">Volume</label>
                    <input id="volume" type="range" min="0" max="2" step="0.01"></input>
                </div>
                
                <button class="item" id="mute" title="Mute"></button>
            </div>
        `;

        this._onClickOutside = this._onClickOutside.bind(this);
    }

    #saveSettings() {
        if (this.#voiceCall) {
            this.#userSettings.voice = this.#voiceCall.getSettings();
        }

        this.#userSettings.save();
    }

    setVoiceCall(voiceCall) {
        this.#voiceCall = voiceCall;
    }

    load(userSettings, userId, voiceController) {
        this.#userSettings = userSettings;
        this.#voiceController = voiceController;
        const voiceSettings = userSettings.voice.users[userId];

        // Volume
        const volumeInput = this.shadowRoot.getElementById("volume");
        const volumeLabel = this.shadowRoot.getElementById("volume-label");

        volumeInput.value = voiceSettings.volume;
        volumeInput.title = parseInt(voiceSettings.volume * 100) + "%";
        volumeLabel.innerText = `Volume ${volumeInput.title}`;
        volumeInput.oninput = () => {
            volumeInput.title = parseInt(volumeInput.value * 100) + "%";
            volumeLabel.innerText = `Volume ${volumeInput.title}`;
            voiceSettings.volume = volumeInput.value;
            if (this.#voiceCall) {
                this.#voiceCall.updateUserVolume(userId);
            }
        }
        volumeInput.onchange = () => {
            this.#saveSettings();
        }

        const volumeBlock = this.shadowRoot.getElementById("volume-block");
        volumeBlock.ondblclick = () => {
            volumeInput.title = "100%";
            volumeLabel.innerText = `Volume ${volumeInput.title}`;
            volumeInput.value = 1;
            voiceSettings.volume = 1;
            this.#saveSettings();
            if (this.#voiceCall) {
                this.#voiceCall.updateUserVolume(userId);
            }
        }

        // Mute
        const muteButton = this.shadowRoot.getElementById("mute");
        muteButton.innerHTML = this.#getMuteHTML(voiceSettings);

        muteButton.onclick = async () => {
            voiceSettings.muted = !voiceSettings.muted;
            muteButton.innerHTML = this.#getMuteHTML(voiceSettings);
            this.#voiceController.updateUserExtension(userId);
            this.#saveSettings();
            if (this.#voiceCall) {
                await this.#voiceCall.setUserMute(userId, voiceSettings.muted);
            }
        }
    }

    #getMuteHTML(voiceSettings) {
        if (voiceSettings.muted) {
            return `Unmute <revoice-icon-speaker-x class="right red"></revoice-icon-speaker-x>`;
        }
        else {
            return `Mute <revoice-icon-speaker  class="right"></revoice-icon-speaker>`;
        }
    }

    open(x, y) {
        this.style.display = "block";

        const w = this.offsetWidth;
        const h = this.offsetHeight;
        const vw = innerWidth;
        const vh = innerHeight;

        // clamp inside viewport
        const left = Math.min(x, vw - w);
        const top = Math.min(y, vh - h);

        this.style.left = left + "px";
        this.style.top = top + "px";

        document.addEventListener("pointerdown", this._onClickOutside, true);
    }

    close() {
        this.style.display = "none";
        document.removeEventListener("pointerdown", this._onClickOutside, true);
    }

    _onClickOutside(e) {
        if (!this.contains(e.target)) this.close();
    }
}

customElements.define("voice-context-menu", VoiceContextMenu);
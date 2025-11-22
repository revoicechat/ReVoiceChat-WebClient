
class VoiceContextMenu extends HTMLElement {
    #voiceCall;
    #userSettings;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <link href="src/css/main.css" rel="stylesheet" />
            <link href="src/css/themes.css" rel="stylesheet" />
            <style>
                :host {
                    display: none;
                    position: fixed;
                    z-index: 9999;
                    width: 13rem;
                    background: var(--qua-bg-color);
                    color: white;
                    border-radius: 10px;
                    padding: 0.5rem;
                    font-family: sans-serif;
                    user-select: none;
                }

                .menu{
                    flex: 1 1 0%;
                    overflow-y: auto;
                }
                
                .item{
                    display: flex;
                    position: relative;
                    flex: 1 1 0%;
                    justify-content: space-between;
                    align-items: stretch;
                    width: 100%;
                    cursor: pointer;
                    margin-top: 0.25rem;
                    border-radius: 0.25rem;
                    padding: 0.5rem;
                    font-weight: 700;
                }

                .right{
                    display:flex;
                    margin-left: auto;
                    margin-right: 0px;
                }

                .slider{
                    flex-direction: column;
                }

                .item:hover{
                    background-color: var(--pri-active-color);
                }

                .item-title{
                }

            </style>

            <div class="menu">

                <div class="item slider">
                    <label id="volume-label">Volume</label>
                    <input id="volume" type="range" min="0" max="2" step="0.01"></input>
                </div>
                
                <button class="item voice-button" id="mute" title="Mute">
                    Mute <revoice-icon-speaker class="right"></revoice-icon-speaker>
                </button>
            </slot>
        `;

        this._onClickOutside = this._onClickOutside.bind(this);
    }

    #saveSettings() {
        if (this.#voiceCall) {
            this.#userSettings.voice = this.#voiceCall.getSettings();
        }

        this.#userSettings.save();
    }

    setVoiceCall(voiceCall){
        this.#voiceCall = voiceCall;
    }

    load(userSettings, userId) {
        this.#userSettings = userSettings
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

        // Mute
        const muteButton = this.shadowRoot.getElementById("mute");
        muteButton.onclick = async () => {
            voiceSettings.muted = !voiceSettings.muted;

            if (voiceSettings.muted) {
                muteButton.innerHTML = `Unmute <revoice-icon-speaker-x class="right red"></revoice-icon-speaker-x>`;
            }
            else {
                muteButton.innerHTML = `Mute <revoice-icon-speaker  class="right"></revoice-icon-speaker>`;
            }

            if (this.#voiceCall) {
                await this.#voiceCall.updateUserMute(userId);
            }

            this.#saveSettings();
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
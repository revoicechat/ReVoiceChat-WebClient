
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
                position: fixed;
                z-index: 9999;
                display: none;
                min-width: 180px;
                background: var(--qua-bg-color);
                color: white;
                border-radius: 8px;
                padding: 6px;
                font-family: sans-serif;
                user-select: none;
            }

            ::slotted([role="menuitem"]) {
                padding: 10px 14px;
                cursor: pointer;
                border-radius: 6px;
                outline: none;
                display: block;
            }

            ::slotted([role="menuitem"]:hover),
            ::slotted([role="menuitem"][data-active="true"]) {
                background: red;
            }

            ::slotted(hr[role="separator"]) {
                border: none;
                height: 1px;
                margin: 6px 0;
                background: yellow;
            }

            slot{
                flex: 1 1 0%;
                overflow-y: auto;
            }
            
            .item{
                display: flex;
                position: relative;
                flex: 1 1 0%;
                justify-content: space-between;
                align-items: flex-start;
                cursor: pointer;
                width: 100%
            }

            .voice-control {
                height: 3rem;
            }

            .voice-control button,
            .voice-control input {
                display: block;
                cursor: pointer;
                margin-top: 0.25rem;
                border-radius: 0.25rem;
                padding: 0.5rem;
                font-weight: 700;
            }
        </style>

        <slot>
            <label class="item">Volume</label>
            <input class="item" id="volume" type="range" min="0" max="2" step="0.01"></input>

            <button class="voice-button" id="mute" title="Mute">
                <revoice-icon-speaker></revoice-icon-speaker>
            </button>
        </slot>
    `;

        this._items = [];
        this._activeIndex = -1;
        this._onClickOutside = this._onClickOutside.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
    }




    #saveSettings() {
        if (this.#voiceCall) {
            this.#userSettings.voice = this.#voiceCall.getSettings();
        }

        this.#userSettings.save();
    }

    load(userSettings, userId, voicecall) {
        this.#userSettings = userSettings
        this.#voiceCall = voicecall;

        const voiceSettings = userSettings.voice.users[userId];

        // Volume
        const volumeInput = this.shadowRoot.getElementById("volume");
        volumeInput.value = voiceSettings.volume;
        volumeInput.title = parseInt(voiceSettings.volume * 100) + "%";
        volumeInput.oninput = () => {
            volumeInput.title = parseInt(volumeInput.value * 100) + "%";
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
                muteButton.classList.add('red');
                muteButton.innerHTML = "<revoice-icon-speaker-x></revoice-icon-speaker-x>";
            }
            else {
                muteButton.classList.remove('red');
                muteButton.innerHTML = "<revoice-icon-speaker></revoice-icon-speaker>";
            }

            if (this.#voiceCall) {
                await this.#voiceCall.updateUserMute(userId);
            }

            this.#saveSettings();
        }
    }

    open(x, y) {
        this._refreshItems();
        this.style.display = "block";

        requestAnimationFrame(() => {
            const w = this.offsetWidth;
            const h = this.offsetHeight;
            const vw = innerWidth;
            const vh = innerHeight;

            // clamp inside viewport
            const left = Math.min(x, vw - w - 8);
            const top = Math.min(y, vh - h - 8);

            this.style.left = left + "px";
            this.style.top = top + "px";

            this._setActive(0);

            document.addEventListener("pointerdown", this._onClickOutside, true);
            document.addEventListener("keydown", this._onKeyDown);
        });
    }

    close() {
        this.style.display = "none";
        this._clearActive();
        document.removeEventListener("pointerdown", this._onClickOutside, true);
        document.removeEventListener("keydown", this._onKeyDown);
    }

    _onClickOutside(e) {
        if (!this.contains(e.target)) this.close();
    }

    _onKeyDown(e) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            this._setActive(this._activeIndex + 1);
        }
        if (e.key === "ArrowUp") {
            e.preventDefault();
            this._setActive(this._activeIndex - 1);
        }
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this._trigger(this._items[this._activeIndex]);
        }
        if (e.key === "Escape") {
            e.preventDefault();
            this.close();
        }
    }

    _setActive(index) {
        if (!this._items.length) return;
        index = (index + this._items.length) % this._items.length;
        this._clearActive();
        this._activeIndex = index;
        const item = this._items[index];
        item.dataset.active = "true";
        item.focus({ preventScroll: true });
    }

    _clearActive() {
        this._items.forEach((el) => delete el.dataset.active);
        this._activeIndex = -1;
    }

    _trigger(item) {
        if (!item) return;
        const action = item.dataset.action;
        this.close();
        this.dispatchEvent(new CustomEvent("context-action", {
            bubbles: true,
            detail: { action }
        }));
    }

    _refreshItems() {
        this._items = [...this.querySelectorAll("[role='menuitem']")];
        this._items.forEach((el) => { el.tabIndex = -1 });
    }
}

customElements.define("voice-context-menu", VoiceContextMenu);
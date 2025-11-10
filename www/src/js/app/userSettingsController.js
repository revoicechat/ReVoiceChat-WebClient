import VoiceCall from "./voiceCall.js";

export default class UserSettingsController {
    #user;
    #mediaUrl;
    #fetcher;
    #room;
    #inputAdvanced = false;
    #currentTab;
    #theme = 'dark';
    #password = {
        password: '',
        newPassword: '',
        confirmPassword: '',
    }
    #newProfilPictureFile;

    voice = structuredClone(VoiceCall.DEFAULT_SETTINGS);
    #audioOutput = {
        main: 1,
        notification: 0.25,
        voice: 1
    }

    constructor(user, fetcher, mediaUrl) {
        this.#user = user;
        this.#fetcher = fetcher;
        this.#mediaUrl = mediaUrl;

        // Add events
        this.#selectEventHandler();
        this.#overviewEventHandler();
        this.#audioInputEventHandler();
        this.#audioOutputEventHandler();

        this.select('overview');
    }

    setRoom(room) {
        this.#room = room;
    }

    async save() {
        const settings = {
            voice: this.voice,
            inputAdvanced: this.#inputAdvanced,
            theme: this.#theme,
        }
        await this.#fetcher.fetchCore(`/settings/me`, 'PATCH', JSON.stringify(settings));
    }

    async load() {
        const result = await this.#fetcher.fetchCore(`/settings/me`, 'GET');
        if (result !== null) {
            const storedSettings = JSON.parse(result);

            if (storedSettings.voice) {
                this.voice.self = storedSettings.voice.self ? storedSettings.voice.self : defaultVoice.self;
                this.voice.users = storedSettings.voice.users ? storedSettings.voice.users : {};
                this.voice.compressor = storedSettings.voice.compressor ? storedSettings.voice.compressor : defaultVoice.compressor;
                this.voice.gate = storedSettings.voice.gate ? storedSettings.voice.gate : defaultVoice.gate;
            }

            if(storedSettings.theme) {
                this.#theme = storedSettings.theme;
            }
        }

        document.documentElement.dataset.theme = this.#theme;

        // Load UI
        this.#overviewLoad();
        this.#themeLoadPreviews();
        this.#emoteLoad();
        this.#gateLoad();
        this.#compressorLoad();
        this.#inputVolumeLoad();
        this.#audioOutputLoad();
    }

    select(name) {
        if (this.#currentTab) {
            document.getElementById(`user-setting-tab-${this.#currentTab}`).classList.remove("active");
            document.getElementById(`user-setting-content-${this.#currentTab}`).classList.add("hidden");
        }

        this.#currentTab = name;
        document.getElementById(`user-setting-tab-${name}`).classList.add('active');
        document.getElementById(`user-setting-content-${name}`).classList.remove('hidden');
    }

    #selectEventHandler() {
        const parameters = ['overview', 'themes', 'emotes', 'audio-input', 'audio-output'];
        for (const param of parameters) {
            document.getElementById(`user-setting-tab-${param}`).addEventListener('click', () => this.select(param));
        }

        document.getElementById(`user-setting-tab-logout`).addEventListener('click', () => this.#user.logout());
    }

    #overviewLoad() {
        document.getElementById("setting-user-uuid").innerText = this.#user.id;
        document.getElementById("overview-displayname").value = this.#user.displayName;
        document.getElementById("setting-user-picture").src = `${this.#mediaUrl}/profiles/${this.#user.id}`;

        const settingUserPictureNewPath = document.getElementById("overview-picture");
        const settingUserPictureNewFile = document.getElementById("overview-picture-new");
        const settingUserPicture = document.getElementById("setting-user-picture");
        this.#newProfilPictureFile = null
        settingUserPictureNewFile.addEventListener("change", () => {
            const file = settingUserPictureNewFile.files[0];
            if (file) {
                this.#newProfilPictureFile = file;
                settingUserPictureNewPath.value = file.name;
                settingUserPicture.src = URL.createObjectURL(file);
                settingUserPicture.style.display = "block";
            }
        });
    }

    #overviewEventHandler() {
        document.getElementById('overview-change-password').addEventListener('click', () => this.#overviewChangePassword());
        document.getElementById('overview-save').addEventListener('click', () => this.#overviewSave());
        document.getElementById('overview-select-picture').addEventListener('click', () => this.#overviewSelectPicture());
    }

    #overviewChangePassword() {
        Swal.fire({
            title: `Change password`,
            animation: false,
            customClass: SwalCustomClass,
            showCancelButton: true,
            focusConfirm: false,
            confirmButtonText: "Change",
            allowOutsideClick: false,
            html: `
            <form class='popup'>
                <label>Current password</label>
                <input type='password' id='popup-current-password'>
                <br/>
                <br/>
                <label>New password</label>
                <input type='password' id='popup-new-password'>
                <br/>
                <br/>
                <label>Confirm password</label>
                <input type='password' id='popup-confirm-password'>
            </form>`,
            didOpen: () => {
                document.getElementById('popup-current-password').oninput = () => { this.#password.password = document.getElementById('popup-current-password').value };
                document.getElementById('popup-new-password').oninput = () => { this.#password.newPassword = document.getElementById('popup-new-password').value };
                document.getElementById('popup-confirm-password').oninput = () => { this.#password.confirmPassword = document.getElementById('popup-confirm-password').value };
            }
            ,
        }).then(async (result) => {
            if (result.value) {
                await this.#fetcher.fetchCore(`/user/me`, 'PATCH', { password: this.#password });

            }
        });
    }

    async #overviewSave() {
        const spinner = new SpinnerOnButton("overview-save")
        spinner.run()
        await this.#overviewChangeName();
        await this.#overviewChangePicture();
        spinner.success()
    }

    async #overviewChangeName() {
        const displayName = document.getElementById("overview-displayname").value
        if (displayName && displayName != "") {
            const result = await this.#fetcher.fetchCore(`/user/me`, 'PATCH', { displayName: displayName });
            if (result) {
                this.#user.displayName = result.displayName
                document.getElementById('overview-displayname').value = result.displayName;
            }
        }
        else {
            Swal.fire({
                icon: 'error',
                title: `Display name invalid`,
                animation: false,
                customClass: SwalCustomClass,
                showCancelButton: false,
                confirmButtonText: "OK",
                allowOutsideClick: false,
            });
            return;
        }
    }

    async #overviewChangePicture() {
        const settingUserPictureNewPath = document.getElementById("overview-picture");
        if (settingUserPictureNewPath.value && this.#newProfilPictureFile) {
            const formData = new FormData();
            formData.append("file", this.#newProfilPictureFile);
            await this.#fetcher.fetchMedia(`/profiles/${this.#user.id}`, formData);
            this.#newProfilPictureFile = null
            settingUserPictureNewPath.value = null
        }
    }

    #overviewSelectPicture() {
        document.getElementById("overview-picture-new").click();
    }

    #themeLoadPreviews() {
        const themeForm = document.getElementById("setting-themes-form");
        for (const theme of getAllDeclaredDataThemes()) {
            const button = document.createElement('button');
            button.onclick = () => this.#themeChange(theme);
            button.className = "theme-select-button";
            button.innerHTML = `<revoice-theme-preview theme="${theme}"></revoice-theme-preview>`;
            themeForm.appendChild(button)
        }
    }

    #themeChange(theme) {
        this.#theme = theme;
        this.save();
        for (const elt of document.querySelectorAll("revoice-message")) {
            elt.dataset.theme = theme;
        }
        document.documentElement.dataset.theme = theme;
        for (const elt of document.querySelectorAll(`revoice-theme-preview`)) {
            elt.parentElement.disabled = false
        }
        document.querySelector(`revoice-theme-preview[theme="${theme}"]`).parentElement.disabled = true;
    }

    #emoteLoad() {
        this.#fetcher.fetchCore(`/emote/me`).then(response => {
            const emoteForm = document.getElementById("user-setting-emotes-form");
            emoteForm.innerHTML = `
            <script type="application/json" slot="emojis-data">
                ${JSON.stringify(response)}
            </script>`;
        });
    }

    // Audio Input
    #audioInputEventHandler() {
        document.getElementById('audio-input-default').addEventListener('click', () => this.#audioInputDefault());
        document.getElementById('audio-input-advanced').addEventListener('click', () => this.#audioInputAdvanced());
        document.getElementById('gate-default').addEventListener('click', () => this.#gateDefault());
        document.getElementById('compressor-default').addEventListener('click', () => this.#compressorDefault());
        document.getElementById('compressor-enabled').addEventListener('click', () => this.#compressorEnabled());

        const parameters = [
            'input-volume',
            'gate-attack',
            'gate-release',
            'gate-threshold',
            'compressor-attack',
            'compressor-ratio',
            'compressor-reduction',
            'compressor-release',
            'compressor-threshold'
        ]

        for (const param of parameters) {
            const element = document.getElementById(param);
            element.addEventListener('input', () => this.#audioInputUpdateUI(param, element));
            element.addEventListener('change', () => this.#audioInputApplyParameter(param, element));
        }
    }

    #audioInputDefault() {
        this.#inputVolumeUpdate({ value: 1 });
        this.#gateDefault();
        this.#compressorDefault();
    }

    #audioInputAdvanced() {
        this.#inputAdvanced = !this.#inputAdvanced;

        const button = document.getElementById("audio-input-advanced");
        if (this.#inputAdvanced) {
            button.innerText = "Simple";
            document.getElementById('voice-sensitivity').innerText = "Noise gate";
            document.getElementById('gate-threshold-label').innerText = `Threshold : ${this.voice.gate.threshold}dB`;
            document.getElementById('audio-input-default').classList.add("hidden");
        } else {
            button.innerText = "Advanced";
            document.getElementById('voice-sensitivity').innerText = "Voice detection";
            document.getElementById('gate-threshold-label').innerText = `Sensitivity ${this.voice.gate.threshold}dB`;
            document.getElementById('audio-input-default').classList.remove("hidden");
        }

        const toggleable = document.getElementsByClassName('voice-toggleable');
        for (const element of toggleable) {
            if (this.#inputAdvanced) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        }
    }

    #audioInputUpdateUI(param, element) {
        switch (param) {
            case 'input-volume':
                document.getElementById('input-volume-label').innerText = `Volume ${Number.parseInt(element.value * 100)}%`;
                break;
            case 'gate-attack':
                document.getElementById('gate-attack-label').innerText = `Attack : ${element.value * 1000}ms`;
                break;
            case 'gate-release':
                document.getElementById('gate-release-label').innerText = `Release : ${element.value * 1000}ms`;
                break;
            case 'gate-threshold': {
                if (this.#inputAdvanced) {
                    document.getElementById('gate-threshold-label').innerText = `Threshold : ${element.value}dB`;
                } else {
                    document.getElementById('gate-threshold-label').innerText = `Sensitivity ${element.value}dB`;
                }
                break;
            }
            case 'compressor-attack':
                document.getElementById('compressor-attack-label').innerText = `Attack : ${element.value * 1000}ms`;
                break;
            case 'compressor-ratio':
                document.getElementById('compressor-ratio-label').innerText = `Ratio : ${element.value}`;
                break;
            case 'compressor-reduction':
                document.getElementById('compressor-reduction-label').innerText = `Reduction : ${element.value}dB`;
                break;
            case 'compressor-release':
                document.getElementById('compressor-release-label').innerText = `Release : ${element.value * 1000}ms`;
                break;
            case 'compressor-threshold':
                document.getElementById('compressor-threshold-label').innerText = `Threshold : ${element.value}dB`;
                break;
        }
    }

    #audioInputApplyParameter(param, element) {
        switch (param.split('-')[0]) {
            case 'input':
                this.#inputVolumeUpdate(element);
                break;
            case 'gate':
                this.#gateApplyParameter(param, element);
                break;
            case 'compressor':
                this.#compressorApplyParameter(param, element);
                break;
        }
    }

    // Input Volume
    #inputVolumeLoad() {
        document.getElementById('input-volume-label').innerText = `Volume ${Number.parseInt(this.voice.self.volume * 100)}%`;
        document.getElementById('input-volume').value = this.voice.self.volume;
    }

    #inputVolumeUpdate(data) {
        this.voice.self.volume = Number.parseFloat(data.value)
        this.save();
        this.#inputVolumeLoad();
        this.#room.voiceController.setSelfVolume();
    }

    // Noise gate
    #gateLoad() {
        document.getElementById('gate-attack').value = this.voice.gate.attack;
        document.getElementById('gate-attack').title = this.voice.gate.attack * 1000 + "ms";
        document.getElementById('gate-attack-label').innerText = `Attack : ${this.voice.gate.attack * 1000}ms`;

        document.getElementById('gate-release').value = this.voice.gate.release;
        document.getElementById('gate-release').title = this.voice.gate.release * 1000 + "ms";
        document.getElementById('gate-release-label').innerText = `Release : ${this.voice.gate.release * 1000}ms`;

        document.getElementById('gate-threshold').value = this.voice.gate.threshold;
        document.getElementById('gate-threshold').title = this.voice.gate.threshold + "dB";

        if (this.#inputAdvanced) {
            document.getElementById('gate-threshold-label').innerText = `Threshold : ${this.voice.gate.threshold}dB`;
        } else {
            document.getElementById('gate-threshold-label').innerText = `Sensitivity ${this.voice.gate.threshold}dB`;
        }
    }

    #gateApplyParameter(param, data) {
        switch (param) {
            case 'gate-attack':
                this.voice.gate.attack = Number.parseFloat(data.value);
                break;
            case 'gate-release':
                this.voice.gate.release = Number.parseFloat(data.value);
                break;
            case 'gate-threshold':
                this.voice.gate.threshold = Number.parseInt(data.value);
                break;
        }

        this.save();
        this.#gateLoad();
        this.#room.voiceController.updateGate();
    }

    #gateDefault() {
        this.voice.gate = structuredClone(VoiceCall.DEFAULT_SETTINGS.gate);
        this.save();
        this.#gateLoad();
        this.#room.voiceController.updateGate();
    }

    // Compressor
    #compressorLoad() {
        const buttonEnabled = document.getElementById('compressor-enabled')
        if (this.voice.compressor.enabled) {
            buttonEnabled.innerText = "Enabled";
            buttonEnabled.classList.remove("disabled");
            buttonEnabled.classList.add("enabled");
        } else {
            buttonEnabled.innerText = "Disabled";
            buttonEnabled.classList.add("disabled");
            buttonEnabled.classList.remove("enabled");
        }

        document.getElementById('compressor-attack').value = this.voice.compressor.attack;
        document.getElementById('compressor-attack').title = this.voice.compressor.attack * 1000 + "ms";
        document.getElementById('compressor-attack-label').innerText = `Attack : ${this.voice.compressor.attack * 1000}ms`;

        document.getElementById('compressor-ratio').value = this.voice.compressor.ratio;
        document.getElementById('compressor-ratio').title = this.voice.compressor.ratio;
        document.getElementById('compressor-ratio-label').innerText = `Ratio : ${this.voice.compressor.ratio}`;

        document.getElementById('compressor-reduction').value = this.voice.compressor.reduction;
        document.getElementById('compressor-reduction').title = this.voice.compressor.reduction + "dB";
        document.getElementById('compressor-reduction-label').innerText = `Reduction : ${this.voice.compressor.reduction}dB`;

        document.getElementById('compressor-release').value = this.voice.compressor.release;
        document.getElementById('compressor-release').title = this.voice.compressor.release * 1000 + "ms";
        document.getElementById('compressor-release-label').innerText = `Release : ${this.voice.compressor.release * 1000}ms`;

        document.getElementById('compressor-threshold').value = this.voice.compressor.threshold;
        document.getElementById('compressor-threshold').title = this.voice.compressor.threshold + "dB";
        document.getElementById('compressor-threshold-label').innerText = `Threshold : ${this.voice.compressor.threshold}dB`;
    }

    #compressorEnabled() {
        this.voice.compressor.enabled = !this.voice.compressor.enabled;
        this.save();
        this.#compressorLoad();
    }

    #compressorApplyParameter(param, data) {
        switch (param) {
            case 'compressor-enabled':
                this.voice.compressor.enabled = data.checked === "checked";
                break;
            case 'compressor-attack':
                this.voice.compressor.attack = Number.parseFloat(data.value);
                break;
            case 'compressor-ratio':
                this.voice.compressor.ratio = Number.parseInt(data.value);
                break;
            case 'compressor-reduction':
                this.voice.compressor.reduction = Number.parseFloat(data.value);
                break;
            case 'compressor-release':
                this.voice.compressor.release = Number.parseFloat(data.value);
                break;
            case 'compressor-threshold':
                this.voice.compressor.threshold = Number.parseInt(data.value);
                break;
        }

        this.save();
        this.#compressorLoad();
    }

    #compressorDefault() {
        this.voice.compressor = structuredClone(VoiceCall.DEFAULT_SETTINGS.compressor);
        this.save();
        this.#compressorLoad();
    }

    // Audio Output
    getNotificationVolume() {
        return this.#audioOutput.main * this.#audioOutput.notification;
    }

    getVoiceVolume() {
        return this.#audioOutput.main * this.#audioOutput.voice;
    }

    #audioOutputEventHandler() {
        const parameters = [
            'output-main-volume',
            'output-notification-volume',
            'output-voice-volume',
        ]

        for (const param of parameters) {
            const element = document.getElementById(param);
            element.addEventListener('input', () => this.#audioOutputUpdateUI(param, element.value));
            element.addEventListener('change', () => this.#audioOutputApplyParameter(param, element.value));
        }
    }

    #audioOutputLoad() {
        document.getElementById('output-main-volume').value = this.#audioOutput.main;
        this.#audioOutputUpdateUI('output-main-volume', this.#audioOutput.main);

        document.getElementById('output-notification-volume').value = this.#audioOutput.notification;
        this.#audioOutputUpdateUI('output-notification-volume', this.#audioOutput.notification);

        document.getElementById('output-voice-volume').value = this.#audioOutput.voice;
        this.#audioOutputUpdateUI('output-voice-volume', this.#audioOutput.voice);
    }

    #audioOutputUpdateUI(param, value) {
        switch (param) {
            case 'output-main-volume':
                document.getElementById('output-main-label').innerText = `Volume ${Number.parseInt(value * 100)}%`;
                break;
            case 'output-notification-volume':
                document.getElementById('output-notification-label').innerText = `Volume ${Number.parseInt(value * 100)}%`;
                break;
            case 'output-voice-volume':
                document.getElementById('output-voice-label').innerText = `Volume ${Number.parseInt(value * 100)}%`;
                break;
        }
    }

    #audioOutputApplyParameter(param, value) {
        switch (param) {
            case 'output-main-volume':
                this.#audioOutput.main = value;
                break;
            case 'output-notification-volume':
                this.#audioOutput.notification = value;
                break;
            case 'output-voice-volume':
                this.#audioOutput.voice = value;
                break;
        }

        this.#room.voiceController.setOutputVolume(this.getVoiceVolume());
    }
}
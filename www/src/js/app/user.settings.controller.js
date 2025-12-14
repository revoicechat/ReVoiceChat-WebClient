import Swal from '../lib/sweetalert2.esm.all.min.js';
import VoiceCall from "./voice.js";
import {LanguageController} from "./language.controller.js";
import {SpinnerOnButton} from "../component/button.spinner.component.js";
import {SwalCustomClass} from "../lib/tools.js";
import {getAllDeclaredDataThemes} from "../component/theme.component.js";
import {i18n} from "../lib/i18n.js";
import MediaServer from "./media/media.server.js";

export default class UserSettingsController {
    #user;
    #fetcher;
    #room;
    #inputAdvanced = false;
    #currentTab;
    #theme = 'dark';
    #lang = 'en';
    #password = {
        password: '',
        newPassword: '',
        confirmPassword: '',
    }
    #newProfilPictureFile;

    voice = structuredClone(VoiceCall.DEFAULT_SETTINGS);
    #audioOutput = {
        notification: 0.25,
        voice: 1,
        stream: 0.5,
    }
    messageSetting = {
        showPicture: true
    }

    constructor(user, fetcher) {
        this.#user = user;
        this.#fetcher = fetcher;

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
            lang: this.#lang,
            audioOutput: this.#audioOutput,
            messageSetting: this.messageSetting,
        }
        await this.#fetcher.fetchCore(`/settings/me`, 'PATCH', settings);
    }

    async load() {
        const storedSettings = await this.#fetcher.fetchCore(`/settings/me`, 'GET');
        if (storedSettings !== null) {
            if (storedSettings.voice) {
                this.voice.self = storedSettings.voice.self ? storedSettings.voice.self : defaultVoice.self;
                this.voice.users = storedSettings.voice.users ? storedSettings.voice.users : {};
                this.voice.compressor = storedSettings.voice.compressor ? storedSettings.voice.compressor : defaultVoice.compressor;
                this.voice.gate = storedSettings.voice.gate ? storedSettings.voice.gate : defaultVoice.gate;
            }

            if (storedSettings.theme) {
                this.#theme = storedSettings.theme;
            }
            if (storedSettings.lang) {
                this.#lang = storedSettings.lang;
            }

            if(storedSettings.audioOutput){
                this.#audioOutput = storedSettings.audioOutput;
            }
            if (storedSettings.messageSetting) {
                this.messageSetting = storedSettings.messageSetting;
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
        await LanguageController.loadAvailableLanguage();
    }

    /** @return {string} */
    getLanguage() {
        return this.#lang;
    }

    /** @param {string} lang */
    setLangage(lang) {
        this.#lang = lang
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
        const parameters = ['overview', 'language', 'themes', 'emotes', 'audio-input', 'audio-output'];
        for (const param of parameters) {
            document.getElementById(`user-setting-tab-${param}`).addEventListener('click', () => this.select(param));
        }

        document.getElementById(`user-setting-tab-logout`).addEventListener('click', () => this.#user.logout());
    }

    #overviewLoad() {
        document.getElementById("setting-user-uuid").innerText = this.#user.id;
        document.getElementById("overview-displayname").value = this.#user.displayName;
        document.getElementById("setting-user-picture").src = MediaServer.profiles(this.#user.id);

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
            <form id="popup-new-password" class='popup'>
                <label data-i18n="user.password.current">Current password</label>
                <input type='password' id='popup-current-password'>
                <br/>
                <br/>
                <label data-i18n="user.password.new">New password</label>
                <input type='password' id='popup-new-password'>
                <br/>
                <br/>
                <label data-i18n="user.password.new.again">Confirm password</label>
                <input type='password' id='popup-confirm-password'>
            </form>`,
            didOpen: () => {
                document.getElementById('popup-current-password').oninput = () => { this.#password.password = document.getElementById('popup-current-password').value };
                document.getElementById('popup-new-password').oninput = () => { this.#password.newPassword = document.getElementById('popup-new-password').value };
                document.getElementById('popup-confirm-password').oninput = () => { this.#password.confirmPassword = document.getElementById('popup-confirm-password').value };
                i18n.translatePage(document.getElementById("popup-new-password"))
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
        if (displayName && displayName !== "") {
            const result = await this.#fetcher.fetchCore(`/user/me`, 'PATCH', { displayName: displayName });
            if (result) {
                this.#user.displayName = result.displayName
                document.getElementById('overview-displayname').value = result.displayName;
            }
        }
        else {
            Swal.fire({
                icon: 'error',
                title: i18n.translateOne("user.name.error"),
                animation: false,
                customClass: SwalCustomClass,
                showCancelButton: false,
                confirmButtonText: "OK",
                allowOutsideClick: false,
            });
        }
    }

    async #overviewChangePicture() {
        const settingUserPictureNewPath = document.getElementById("overview-picture");
        if (settingUserPictureNewPath.value && this.#newProfilPictureFile) {
            const formData = new FormData();
            formData.append("file", this.#newProfilPictureFile);
            await MediaServer.fetch(`/profiles/${this.#user.id}`, 'POST', formData);
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
            button.innerText = i18n.translateOne("button.simple");
            document.getElementById('voice-sensitivity').innerText = "Noise gate";
            document.getElementById('gate-threshold-label').innerText = `Threshold : ${this.voice.gate.threshold}dB`;
            document.getElementById('audio-input-default').classList.add("hidden");
        } else {
            button.innerText = i18n.translateOne("button.advanced");
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
                i18n.updateValue('input-volume-label', parseInt((element.value * 100)).toString());
                break;
            case 'gate-attack':
                i18n.updateValue('gate-attack-label', (element.value * 1000).toString());
                break;
            case 'gate-release':
                i18n.updateValue('gate-release-label', (element.value * 1000).toString());
                break;
            case 'gate-threshold': {
                document.getElementById('gate-threshold-label').dataset.i18n = this.#inputAdvanced
                    ? 'voice.threshold'
                    : 'voice.sensitivity.label';
                i18n.updateValue('gate-threshold-label', (element.value).toString());
                break;
            }
            case 'compressor-attack':
                i18n.updateValue('compressor-attack-label', (element.value * 1000).toString());
                break;
            case 'compressor-ratio':
                i18n.updateValue('compressor-ratio-label', (element.value).toString());
                break;
            case 'compressor-reduction':
                i18n.updateValue('compressor-reduction-label', (element.value).toString());
                break;
            case 'compressor-release':
                i18n.updateValue('compressor-release-label', (element.value * 1000).toString());
                break;
            case 'compressor-threshold':
                i18n.updateValue('compressor-threshold-label', (element.value).toString());
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
        void this.save();
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

        void this.save();
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
            buttonEnabled.classList.remove("background-red");
            buttonEnabled.classList.add("background-green");
        } else {
            buttonEnabled.innerText = "Disabled";
            buttonEnabled.classList.add("background-red");
            buttonEnabled.classList.remove("background-green");
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
        void this.save();
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

        void this.save();
        this.#compressorLoad();
    }

    #compressorDefault() {
        this.voice.compressor = structuredClone(VoiceCall.DEFAULT_SETTINGS.compressor);
        void this.save();
        this.#compressorLoad();
    }

    // Audio Output
    getNotificationVolume() {
        return this.#audioOutput.notification;
    }

    getVoiceVolume() {
        return this.#audioOutput.voice;
    }

    getStreamVolume() {
        return this.#audioOutput.stream;
    }

    #audioOutputEventHandler() {
        const parameters = [
            'output-notification-volume',
            'output-voice-volume',
            'output-stream-volume',
        ]

        for (const param of parameters) {
            const element = document.getElementById(param);
            element.addEventListener('input', () => this.#audioOutputUpdateUI(param, element.value));
            element.addEventListener('change', () => this.#audioOutputApplyParameter(param, element.value));
        }
    }

    #audioOutputLoad() {
        document.getElementById('output-notification-volume').value = this.#audioOutput.notification;
        this.#audioOutputUpdateUI('output-notification-volume', this.#audioOutput.notification);

        document.getElementById('output-voice-volume').value = this.#audioOutput.voice;
        this.#audioOutputUpdateUI('output-voice-volume', this.#audioOutput.voice);

        document.getElementById('output-stream-volume').value = this.#audioOutput.stream;
        this.#audioOutputUpdateUI('output-stream-volume', this.#audioOutput.stream);
    }

    #audioOutputUpdateUI(param, value) {
        switch (param) {
            case 'output-notification-volume':
                document.getElementById('output-notification-label').innerText = `Volume ${Number.parseInt(value * 100)}%`;
                break;
            case 'output-voice-volume':
                document.getElementById('output-voice-label').innerText = `Volume ${Number.parseInt(value * 100)}%`;
                break;
            case 'output-stream-volume':
                document.getElementById('output-stream-label').innerText = `Volume ${Number.parseInt(value * 100)}%`;
                break;
        }
    }

    #audioOutputApplyParameter(param, value) {
        switch (param) {
            case 'output-notification-volume':
                this.#audioOutput.notification = value;
                break;
            case 'output-voice-volume':
                this.#audioOutput.voice = value;
                break;
            case 'output-stream-volume':
                this.#audioOutput.stream = value;
                break;
        }

        this.save();
        this.#room.voiceController.setOutputVolume(this.getVoiceVolume());
    }
}
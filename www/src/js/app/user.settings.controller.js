import VoiceCall from "./voice/voice.js";
import { LanguageController } from "./language.controller.js";
import { SpinnerOnButton } from "../component/button.spinner.component.js";
import { getAllDeclaredDataThemes } from "../component/theme.component.js";
import { i18n } from "../lib/i18n.js";
import MediaServer from "./media/media.server.js";
import CoreServer from "./core/core.server.js";
import Modal from "../component/modal.component.js";
import { UserNotificationRepresentation } from "../representation/user.representation.js";
import { MessageRepresentation } from "../representation/room.representation.js";

export default class UserSettingsController {
    #user;
    #room;
    #inputAdvanced = false;
    #currentTab;
    #theme = 'dark';
    #lang = 'en';
    /** @type {"default"|"compact"}  */
    messageSetting = 'default';
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

    #cachedElements = {
        userUUID: null,
        userName: null,
        userPicture: null,
        overviewPicture: null,
        overviewPictureNew: null,
        inputVolume: null,
        inputVolumeLabel: null,
        gateThreshold: null,
        gateThresholdLabel: null,
        outputNotificationLabel: null,
        outputVoiceLabel: null,
        outputStreamLabel: null,
    }

    constructor(user) {
        this.#user = user;

        this.#cachedElements.userUUID = document.getElementById("setting-user-uuid");
        this.#cachedElements.userName = document.getElementById("settings-user-name");
        this.#cachedElements.userPicture = document.getElementById("setting-user-picture");
        this.#cachedElements.overviewPicture = document.getElementById("overview-picture");
        this.#cachedElements.overviewPictureNew = document.getElementById("overview-picture-new");
        this.#cachedElements.inputVolume = document.getElementById("input-volume");
        this.#cachedElements.inputVolumeLabel = document.getElementById("input-volume-label");
        this.#cachedElements.gateThreshold = document.getElementById("gate-threshold");
        this.#cachedElements.gateThresholdLabel = document.getElementById("gate-threshold-label");
        this.#cachedElements.outputNotificationLabel = document.getElementById('output-notification-label');
        this.#cachedElements.outputVoiceLabel = document.getElementById('output-voice-label');
        this.#cachedElements.outputStreamLabel = document.getElementById('output-stream-label');

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
        await CoreServer.fetch(`/settings/me`, 'PATCH', settings);
    }

    async load() {
        const storedSettings = await CoreServer.fetch(`/settings/me`, 'GET');
        if (storedSettings !== null) {
            this.#loadVoiceSettings(storedSettings);
            this.#loadAudioSettings(storedSettings);
            this.#loadTheme(storedSettings);
            this.#loadLang(storedSettings);
            this.#loadMessageSettings(storedSettings);
        }
        document.documentElement.dataset.theme = this.#theme;

        // UI
        this.#overviewLoad();
        this.#themeLoadPreviews();
        this.#messageSettingsLoad();
        this.#emoteLoad();
        this.#audioInputLoad();
        this.#audioOutputLoad();
        await LanguageController.loadAvailableLanguage();
    }


    #loadVoiceSettings(storedSettings) {
        if (storedSettings.voice) {
            this.voice.self = storedSettings.voice.self ? storedSettings.voice.self : defaultVoice.self;
            this.voice.users = storedSettings.voice.users ? storedSettings.voice.users : {};
            this.voice.compressor = storedSettings.voice.compressor ? storedSettings.voice.compressor : defaultVoice.compressor;
            this.voice.gate = storedSettings.voice.gate ? storedSettings.voice.gate : defaultVoice.gate;
        }
    }

    #loadAudioSettings(storedSettings) {
        if (storedSettings.audioOutput) {
            this.#audioOutput = storedSettings.audioOutput;
        }
    }

    #loadTheme(storedSettings) {
        if (storedSettings.theme) {
            this.#theme = storedSettings.theme;
        }
    }

    #loadLang(storedSettings) {
        if (storedSettings.lang) {
            this.#lang = storedSettings.lang;
        }
    }

    #loadMessageSettings(storedSettings) {
        if (storedSettings.messageSetting) {
            this.messageSetting = storedSettings.messageSetting;
        }
    }

    /** @return {string} */
    getLanguage() {
        return this.#lang;
    }

    /** @return {string} */
    getMessageSetting() {
        return this.messageSetting;
    }

    /** @param {string} messageSetting */
    setMessageSetting(messageSetting) {
        this.messageSetting = messageSetting;
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
        const parameters = ['overview', 'appearance', 'emotes', 'audio-input', 'audio-output'];
        for (const param of parameters) {
            document.getElementById(`user-setting-tab-${param}`).addEventListener('click', () => this.select(param));
        }

        document.getElementById(`user-setting-tab-logout`).addEventListener('click', () => this.#user.logout());
    }

    #overviewLoad() {
        this.#newProfilPictureFile = null
        this.#cachedElements.userUUID.innerText = this.#user.id;
        this.#cachedElements.userName.value = this.#user.displayName;
        this.#cachedElements.userPicture.src = MediaServer.profiles(this.#user.id);
        this.#cachedElements.userPicture.dataset.id = this.#user.id;
        this.#cachedElements.overviewPictureNew.addEventListener("change", () => {
            const file = this.#cachedElements.overviewPictureNew.files[0];
            if (file) {
                this.#newProfilPictureFile = file;
                this.#cachedElements.overviewPicture.value = file.name;
                this.#cachedElements.userPicture.src = URL.createObjectURL(file);
                this.#cachedElements.userPicture.style.display = "block";
            }
        });
    }

    #overviewEventHandler() {
        document.getElementById('overview-change-password').addEventListener('click', () => this.#overviewChangePassword());
        document.getElementById('overview-save').addEventListener('click', () => this.#overviewSave());
        document.getElementById('overview-select-picture').addEventListener('click', () => this.#overviewSelectPicture());
    }

    #overviewChangePassword() {
        Modal.toggle({
            title: `Change password`,
            showCancelButton: true,
            focusConfirm: false,
            confirmButtonText: i18n.translateOne("modal.save"),
            allowOutsideClick: false,
            width: "30rem",
            html: `
            <form id="popup-new-password-form" class='popup'>
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
                const currentPassword = document.getElementById('popup-current-password');
                currentPassword.oninput = () => { this.#password.password = currentPassword.value };

                const newPassword = document.getElementById('popup-new-password');
                newPassword.oninput = () => { this.#password.newPassword = newPassword.value };

                const confirmPassword = document.getElementById('popup-confirm-password');
                confirmPassword.oninput = () => { this.#password.confirmPassword = confirmPassword.value };

                i18n.translatePage(document.getElementById("popup-new-password"))
            }
            ,
        }).then(async (result) => {
            console.log(result)
            if (result.isConfirmed) {
                await CoreServer.fetch(`/user/me`, 'PATCH', { password: this.#password });
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
        const displayName = this.#cachedElements.userName.value
        if (displayName && displayName !== "") {
            const result = await CoreServer.fetch(`/user/me`, 'PATCH', { displayName: displayName });
            if (result) {
                this.#user.displayName = result.displayName
                this.#cachedElements.userName.value = result.displayName;
            }
        }
        else {
            await Modal.toggleError(i18n.translateOne("user.name.error"));
        }
    }

    async #overviewChangePicture() {
        if (this.#cachedElements.overviewPicture.value && this.#newProfilPictureFile) {
            const formData = new FormData();
            formData.append("file", this.#newProfilPictureFile);
            await MediaServer.fetch(`/profiles/${this.#user.id}`, 'POST', formData);
            this.#newProfilPictureFile = null
            this.#cachedElements.overviewPicture.value = null
        }
    }

    #overviewSelectPicture() {
        this.#cachedElements.overviewPictureNew.click();
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

    #messageSettingsLoad() {
        const select = document.getElementById("setting-message-selection");
        for (const key of ["default", "compact"]) {
            const option = document.createElement('option');
            option.value = key
            option.innerText = key
            option.selected = (key === RVC.user.settings.getMessageSetting())
            select.appendChild(option);
        }
        select.addEventListener("change", async (event) => {
            const value = event.target.value;
            RVC.user.settings.setMessageSetting(value);
            await RVC.user.settings.save();
            this.buildMessageExemple();
            await this.#reloadMessage();
        });
    }

    buildMessageExemple() {
        const holder = document.querySelector("#setting-message-exemple")
        for (const elt of holder.querySelectorAll("div")) {
            elt.remove();
        }
        holder.append(this.#fakeMessage("Hello world 🦜"));
        const translatedMessage1 = this.#fakeMessage(i18n.translateOne("user.message.exemple1.body"));
        const translatedMessage2 = this.#fakeMessage(i18n.translateOne("user.message.exemple2.body"));
        holder.append(translatedMessage1);
        holder.append(translatedMessage2);
        holder.append(this.#fakeMessage("🦜"));
    }

    #fakeMessage(text) {
        const user = new UserNotificationRepresentation()
        user.id = this.#user.id;
        user.displayName = this.#user.displayName;
        const message = new MessageRepresentation();
        message.id = "setting-message-exemple-body";
        message.text = text;
        message.roomId = "test";
        message.createdDate = "2025-12-23 24:00Z";
        message.updatedDate = null;
        message.medias = [];
        message.emotes = [];
        message.reactions = [];
        message.user = user;
        return RVC.room.textController.create(message);
    }


    async #reloadMessage() {
        RVC.room.textController.clearCache();
        await RVC.room.textController.load(RVC.room.id);
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
        CoreServer.fetch(`/emote/me`).then(response => {
            const emoteForm = document.getElementById("user-setting-emotes-form");
            emoteForm.innerHTML = `
            <script type="application/json" slot="emojis-data">
                ${JSON.stringify(response)}
            </script>`;
        });
    }

    // Audio Input
    #audioInputEventHandler() {
        document.getElementById('gate-default').addEventListener('click', () => this.#gateDefault());
        document.getElementById('compressor-enabled').addEventListener('click', () => this.#compressorEnabled());

        const parameters = [
            'input-volume',
            'gate-threshold',
        ]

        for (const param of parameters) {
            const element = document.getElementById(param);
            element.addEventListener('input', () => this.#audioInputUpdateUI(param, element));
            element.addEventListener('change', () => this.#audioInputApplyParameter(param, element));
        }
    }

    #audioInputLoad() {
        // Volume
        i18n.updateValue(this.#cachedElements.inputVolumeLabel, Number.parseInt((this.voice.self.volume * 100)).toString());
        this.#cachedElements.inputVolume.value = this.voice.self.volume;

        // Voice detection
        i18n.updateValue(this.#cachedElements.gateThresholdLabel, (this.voice.gate.threshold).toString());
        this.#cachedElements.gateThreshold.value = this.voice.gate.threshold;
        this.#cachedElements.gateThreshold.title = this.voice.gate.threshold + "dB";

        // Compressor
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
    }

    #audioInputUpdateUI(param, element) {
        switch (param) {
            case 'input-volume':
                i18n.updateValue(this.#cachedElements.inputVolumeLabel, Number.parseInt((element.value * 100)).toString());
                break;
            case 'gate-threshold': {
                i18n.updateValue(this.#cachedElements.gateThresholdLabel, (element.value).toString());
                break;
            }
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
        }
    }

    #inputVolumeUpdate(data) {
        this.voice.self.volume = Number.parseFloat(data.value)
        void this.save();
        this.#room.voiceController.setSelfVolume();
    }

    #gateApplyParameter(param, data) {
        switch (param) {
            case 'gate-threshold':
                this.voice.gate.threshold = Number.parseInt(data.value);
                break;
        }

        void this.save();
        this.#room.voiceController.updateGate();
    }

    #gateDefault() {
        this.voice.gate = structuredClone(VoiceCall.DEFAULT_SETTINGS.gate);
        this.save();
        this.#room.voiceController.updateGate();
        this.#audioInputLoad();
    }

    #compressorEnabled() {
        this.voice.compressor.enabled = !this.voice.compressor.enabled;
        void this.save();
        this.#audioInputLoad();
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
                this.#cachedElements.outputNotificationLabel.innerText = `Volume ${Number.parseInt(value * 100)}%`;
                break;
            case 'output-voice-volume':
                this.#cachedElements.outputVoiceLabel.innerText = `Volume ${Number.parseInt(value * 100)}%`;
                break;
            case 'output-stream-volume':
                this.#cachedElements.outputStreamLabel.innerText = `Volume ${Number.parseInt(value * 100)}%`;
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
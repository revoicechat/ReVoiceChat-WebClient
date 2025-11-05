import VoiceCall from "./voiceCall.js";

export default class SettingsController {
    #fetcher;
    voice = structuredClone(VoiceCall.DEFAULT_SETTINGS);

    constructor(fetcher) {
        this.#fetcher = fetcher;

        // Voice default
        document.getElementById('voice-default').addEventListener('click', () => this.#voiceDefault());

        this.#inputVolumeEventHandler();
        this.#noiseGateEventHandler();
        this.#compressorEventHandler();
    }

    async save() {
        const settings = {
            voice: this.voice,
        }
        await this.#fetcher.fetchCore(`/settings/me`, 'PATCH', JSON.stringify(settings));
    }

    async load() {
        const result = await this.#fetcher.fetchCore(`/settings/me`, 'GET');
        if (result !== null) {
            const storedSettings = JSON.parse(result);
            console.log(storedSettings);
            if (storedSettings.voice) {
                this.voice.self = storedSettings.voice.self ? storedSettings.voice.self : defaultVoice.self;
                this.voice.users = storedSettings.voice.users ? storedSettings.voice.users : {};
                this.voice.compressor = storedSettings.voice.compressor ? storedSettings.voice.compressor : defaultVoice.compressor;
                this.voice.gate = storedSettings.voice.gate ? storedSettings.voice.gate : defaultVoice.gate;
            }
        }
    }

    updateUI() {
        this.#noiseGateShow();
        this.#compressorShow();
        this.#inputVolumeShow();
    }

    #voiceDefault() {
        this.#inputVolumeUpdate({ value: 1 });
        this.#noiseGateDefault();
        this.#compressorDefault();
    }

    // Input Volume
    #inputVolumeEventHandler(){
        const inputVolume = document.getElementById('input-volume');
        inputVolume.addEventListener('change', () => this.#inputVolumeUpdate(inputVolume));
        inputVolume.addEventListener('input', () => this.#inputVolumeUpdateUI(inputVolume));
    }

    #inputVolumeUpdateUI(element) {
        document.getElementById('input-volume-label').innerText = `Volume ${Number.parseInt(element.value * 100)}%`;
    }

    #inputVolumeShow() {
        document.getElementById('input-volume-label').innerText = `Volume ${Number.parseInt(this.voice.self.volume * 100)}%`;
        document.getElementById('input-volume').value = this.voice.self.volume;
    }

    #inputVolumeUpdate(data) {
        this.voice.self.volume = Number.parseFloat(data.value)
        this.save();
        this.#inputVolumeShow();
        RVC.room.voiceController.setSelfVolume();
    }

    // Noise gate
    #noiseGateEventHandler(){
        document.getElementById('noise-gate-default').addEventListener('click', () => this.#noiseGateDefault());

        const noiseGateParameters = ['attack', 'release', 'threshold'];
        for (const param of noiseGateParameters) {
            const element = document.getElementById(`noise-gate-${param}`);
            element.addEventListener('change', () => this.#noiseGateUpdate(param, element));
            element.addEventListener('input', () => this.#noiseGateUpdateUI(param, element));
        }
    }

    #noiseGateUpdateUI(param, element) {
        switch (param) {
            case 'attack':
                document.getElementById('noise-gate-attack-label').innerText = `Attack : ${element.value * 1000}ms`;
                break;
            case 'release':
                document.getElementById('noise-gate-release-label').innerText = `Release : ${element.value * 1000}ms`;
                break;
            case 'threshold': {
                if (currentSetting.voiceAdvanced) {
                    document.getElementById('noise-gate-threshold-label').innerText = `Threshold : ${element.value}dB`;
                } else {
                    document.getElementById('noise-gate-threshold-label').innerText = `Sensitivity ${element.value}dB`;
                }
                break;
            }
        }
    }

    #noiseGateShow() {
        document.getElementById('noise-gate-attack').value = this.voice.gate.attack;
        document.getElementById('noise-gate-attack').title = this.voice.gate.attack * 1000 + "ms";
        document.getElementById('noise-gate-attack-label').innerText = `Attack : ${this.voice.gate.attack * 1000}ms`;

        document.getElementById('noise-gate-release').value = this.voice.gate.release;
        document.getElementById('noise-gate-release').title = this.voice.gate.release * 1000 + "ms";
        document.getElementById('noise-gate-release-label').innerText = `Release : ${this.voice.gate.release * 1000}ms`;

        document.getElementById('noise-gate-threshold').value = this.voice.gate.threshold;
        document.getElementById('noise-gate-threshold').title = this.voice.gate.threshold + "dB";

        if (currentSetting.voiceAdvanced) {
            document.getElementById('noise-gate-threshold-label').innerText = `Threshold : ${this.voice.gate.threshold}dB`;
        } else {
            document.getElementById('noise-gate-threshold-label').innerText = `Sensitivity ${this.voice.gate.threshold}dB`;
        }
    }

    #noiseGateUpdate(param, data) {
        switch (param) {
            case 'attack':
                this.voice.gate.attack = Number.parseFloat(data.value);
                break;
            case 'release':
                this.voice.gate.release = Number.parseFloat(data.value);
                break;
            case 'threshold':
                this.voice.gate.threshold = Number.parseInt(data.value);
                break;
        }

        this.save();
        this.#noiseGateShow();
        RVC.room.voiceController.updateGate();
    }

    #noiseGateDefault() {
        this.voice.gate = structuredClone(VoiceCall.DEFAULT_SETTINGS.gate);
        this.save();
        this.#noiseGateShow();
        RVC.room.voiceController.updateGate();
    }

    // Compressor
    #compressorEventHandler(){
        document.getElementById('compressor-default').addEventListener('click', () => this.#compressorDefault());
        document.getElementById('compressor-enabled').addEventListener('click', () => this.#compressorEnabled());

        const compressorParameters = ['attack', 'ratio', 'reduction', 'release', 'threshold'];
        for (const param of compressorParameters) {
            const element = document.getElementById(`compressor-${param}`);
            element.addEventListener('change', () => this.#compressorUpdate(param, element));
            element.addEventListener('input', () => this.#compressorUpdateUI(param, element));
        }
    }

    #compressorUpdateUI(param, element) {
        switch (param) {
            case 'attack':
                document.getElementById('compressor-attack-label').innerText = `Attack : ${element.value * 1000}ms`;
                break;
            case 'ratio':
                document.getElementById('compressor-ratio-label').innerText = `Ratio : ${element.value}`;
                break;
            case 'reduction':
                document.getElementById('compressor-reduction-label').innerText = `Reduction : ${element.value}dB`;
                break;
            case 'release':
                document.getElementById('compressor-release-label').innerText = `Release : ${element.value * 1000}ms`;
                break;
            case 'threshold':
                document.getElementById('compressor-threshold-label').innerText = `Threshold : ${element.value}dB`;
                break;
        }
    }

    #compressorShow() {
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
        this.#compressorShow();
    }

    #compressorUpdate(param, data) {
        switch (param) {
            case 'enabled':
                this.voice.compressor.enabled = data.checked === "checked";
                break;
            case 'attack':
                this.voice.compressor.attack = Number.parseFloat(data.value);
                break;
            case 'ratio':
                this.voice.compressor.ratio = Number.parseInt(data.value);
                break;
            case 'reduction':
                this.voice.compressor.reduction = Number.parseFloat(data.value);
                break;
            case 'release':
                this.voice.compressor.release = Number.parseFloat(data.value);
                break;
            case 'threshold':
                this.voice.compressor.threshold = Number.parseInt(data.value);
                break;
        }

        this.save();
        this.#compressorShow();
    }

    #compressorDefault() {
        this.voice.compressor = structuredClone(VoiceCall.DEFAULT_SETTINGS.compressor);
        this.save();
        this.#compressorShow();
    }
}
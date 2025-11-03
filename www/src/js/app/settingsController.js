import VoiceCall from "./voiceCall.js";

export default class SettingsController {
    voice = VoiceCall.DEFAULT_SETTINGS;

    constructor() {
        // Voice default
        document.getElementById('voice-default').addEventListener('click', () => this.#voiceDefault());

        // Input Volume
        const inputVolume = document.getElementById('input-volume');
        inputVolume.addEventListener('change', () => this.#volumeUpdate(inputVolume));
        inputVolume.addEventListener('input', () => this.#volumeUpdateUI(inputVolume));

        // NoiseGate events
        document.getElementById('noise-gate-default').addEventListener('click', () => this.#noiseGateDefault());

        const noiseGateAttack = document.getElementById('noise-gate-attack');
        noiseGateAttack.addEventListener('change', () => this.#noiseGateUpdate('attack', noiseGateAttack));
        noiseGateAttack.addEventListener('input', () => this.#noiseGateUpdateUI('attack', noiseGateAttack));

        const noiseGateRelease = document.getElementById('noise-gate-release');
        noiseGateRelease.addEventListener('change', () => this.#noiseGateUpdate('release', noiseGateRelease));
        noiseGateRelease.addEventListener('input', () => this.#noiseGateUpdateUI('release', noiseGateRelease));

        const noiseGateThreshold = document.getElementById('noise-gate-threshold');
        noiseGateThreshold.addEventListener('change', () => this.#noiseGateUpdate('threshold', noiseGateThreshold));
        noiseGateThreshold.addEventListener('input', () => this.#noiseGateUpdateUI('threshold', noiseGateThreshold));

        // Compressor events
        document.getElementById('compressor-default').addEventListener('click', () => this.#compressorDefault());
        document.getElementById('compressor-enabled').addEventListener('click', () => this.#compressorEnabled());

        const compressorAttack = document.getElementById('compressor-attack');
        compressorAttack.addEventListener('change', () => this.#compressorUpdate('attack', compressorAttack));
        compressorAttack.addEventListener('input', () => this.#compressorUpdateUI('attack', compressorAttack));

        const compressorRatio = document.getElementById('compressor-ratio');
        compressorRatio.addEventListener('change', () => this.#compressorUpdate('ratio', compressorRatio));
        compressorRatio.addEventListener('input', () => this.#compressorUpdateUI('ratio', compressorRatio));

        const compressorReduction = document.getElementById('compressor-reduction');
        compressorReduction.addEventListener('change', () => this.#compressorUpdate('reduction', compressorReduction));
        compressorReduction.addEventListener('input', () => this.#compressorUpdateUI('reduction', compressorReduction));

        const compressorRelease = document.getElementById('compressor-release');
        compressorRelease.addEventListener('change', () => this.#compressorUpdate('release', compressorRelease));
        compressorRelease.addEventListener('input', () => this.#compressorUpdateUI('release', compressorRelease));

        const compressorThreshold = document.getElementById('compressor-threshold');
        compressorThreshold.addEventListener('change', () => this.#compressorUpdate('threshold', compressorThreshold));
        compressorThreshold.addEventListener('input', () => this.#compressorUpdateUI('threshold', compressorThreshold));
    }

    save() {
        const settings = {
            voice: this.voice,
        }

        localStorage.setItem('userSettings', JSON.stringify(settings));
    }

    load() {
        const storedSettings = JSON.parse(localStorage.getItem('userSettings'));

        // Apply settings
        if (storedSettings.voice) {
            
            this.voice.self = storedSettings.voice.self ? storedSettings.voice.self : defaultVoice.self;
            this.voice.users = storedSettings.voice.users ? storedSettings.voice.users : {};
            this.voice.compressor = storedSettings.voice.compressor ? storedSettings.voice.compressor : defaultVoice.compressor;
            this.voice.gate = storedSettings.voice.gate ? storedSettings.voice.gate : defaultVoice.gate;
        }
    }

    updateUI() {
        this.#noiseGateShow();
        this.#compressorShow();
        this.#volumeShow();
    }

    #voiceDefault() {
        this.#volumeUpdate({ value: 1 });
        this.#noiseGateDefault();
        this.#compressorDefault();
    }

    // Input Volume
    #volumeUpdateUI(element) {
        document.getElementById('input-volume-label').innerText = `Volume ${Number.parseInt(element.value * 100)}%`;
    }

    #volumeShow() {
        document.getElementById('input-volume-label').innerText = `Volume ${Number.parseInt(this.voice.self.volume * 100)}%`;
        document.getElementById('input-volume').value = this.voice.self.volume;
    }

    #volumeUpdate(data) {
        this.voice.self.volume = Number.parseFloat(data.value)
        this.save();
        this.#volumeShow();
        RVC.room.voiceController.setSelfVolume();
    }

    // Noise gate
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
        this.voice.gate = VoiceCall.DEFAULT_SETTINGS.gate;
        this.save();
        this.#noiseGateShow();
        RVC.room.voiceController.updateGate();
    }

    // Compressor
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
        this.voice.compressor = VoiceCall.DEFAULT_SETTINGS.compressor;
        this.save();
        this.#compressorShow();
    }
}
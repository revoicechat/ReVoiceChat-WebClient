class AudioCollector extends AudioWorkletProcessor {
    process(inputs) {
        const input = inputs[0][0]; // mono
        if (input) {
            // Send Float32Array (128 samples) to main thread
            this.port.postMessage(new Float32Array(input));
        }
        return true;
    }
}

class NoiseGate extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'attack', defaultValue: 0.01 },   // seconds
            { name: 'release', defaultValue: 0.4 },   // seconds
            { name: 'threshold', defaultValue: -50, minValue: -100, maxValue: 0 }, // dB
        ];
    }

    constructor() {
        super();
        this.gain = 0;
        this.sampleRate = sampleRate;
        this.smoothRms = 0;
        this.gateFloor = this.dBToLinear(-100);
        this.smoothing = 0.9;
    }

    dBToLinear(db) {
        return Math.pow(10, db / 20);
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0][0]; // mono
        const output = outputs[0][0]; // mono
        const threshold = this.dBToLinear(parameters.threshold);
        const attackCoeff = Math.exp(-1 / (parameters.attack * this.sampleRate / 1000));
        const releaseCoeff = Math.exp(-1 / (parameters.release * this.sampleRate / 1000));

        if (!input || input.length === 0) {
            return false;
        }

        // Compute RMS level
        let sum = 0;
        for (let sample of input) {
            sum += sample ** 2;
        }
        const rms = Math.sqrt(sum / input.length);

        this.smoothRms = (this.smoothRms ** 2) + (rms * (1 - this.smoothing));

        // Gate logic
        if (this.smoothRms > threshold) {
            // Gate open
            this.gain = 1 - (1 - this.gain) * attackCoeff;
        } else {
            // Gate close
            this.gain = this.gain * releaseCoeff;

            if (this.gain <= this.gateFloor) {
                this.gain = this.gateFloor;
            }
        }

        // Apply gain
        for (let i = 0; i < input.length; i++) {
            output[i] = input[i] * this.gain;
        }

        // Determine open/close state (with hysteresis to avoid flicker)
        const openNow = this.smoothRms > threshold * 1.1; // 10% hysteresis
        if (openNow !== this.isOpen) {
            this.isOpen = openNow;
            this.port.postMessage({ open: this.isOpen });
        }

        return true;
    }
}

registerProcessor("AudioCollector", AudioCollector);
registerProcessor('NoiseGate', NoiseGate);
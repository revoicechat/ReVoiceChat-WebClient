import Stream from "./stream.js";

export default class StreamController {
    #streamUrl;
    #token;
    #streamer = [];
    #viewer = [];
    #room;
    #user;
    #webcamEnabled = false;
    #displayEnabled = false;

    constructor(fetcher, alert, user, room, token, streamUrl) {
        this.#streamUrl = streamUrl;
        this.#token = token;
        this.#room = room;
        this.#user = user;
    }

    attachEvents() {
        document.getElementById("stream-webcam").addEventListener('click', () => this.#toggleStream("webcam"));
        document.getElementById("stream-display").addEventListener('click', () => this.#toggleStream("display"));
    }

    #toggleStream(type) {
        if (type == "webcam") {
            this.#webcamEnabled = !this.#webcamEnabled;
            const button = document.getElementById("stream-webcam");

            if (this.#webcamEnabled) {
                this.#startStream("webcam");
                button.classList.add("green");
            }
            else {
                this.#stopStream("webcam");
                button.classList.remove("green");
            }
            return;
        }

        if (type == "display") {
            this.#displayEnabled = !this.#displayEnabled;
            const button = document.getElementById("stream-display");

            if (this.#displayEnabled) {
                this.#startStream("display");
                button.classList.add("green");
            }
            else {
                this.#stopStream("display");
                button.classList.remove("green");
            }
            return;
        }
    }

    async #startStream(type) {
        try {
            this.#streamer[type] = new Stream(this.#streamUrl, this.#user, this.#token, this.#room.id);
            await this.#streamer[type].start(type, type);
        }
        catch (error) {
            console.error(error);
        }
    }

    async #stopStream(type) {
        if (this.#streamer[type]) {
            await this.#streamer[type].stop();
        }
    }

    async joinStream(userId, streamName) {
        this.#viewer[streamName] = new Stream(this.#streamUrl, this.#user, this.#token, this.#room.id);
        await this.#viewer[streamName].join(userId, streamName);
    }

    async leaveStream(streamName) {
        if (this.#viewer[streamName]) {
            await this.#viewer[streamName].stop();
        }
    }

    async stopAll() {
        this.#stopStream("webcam");
        this.#stopStream("display");
        this.#displayEnabled = false;
        this.#webcamEnabled = false;
    }
}
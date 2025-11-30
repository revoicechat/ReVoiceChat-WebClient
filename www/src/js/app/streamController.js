import {Streamer, Viewer} from "./stream.js";

export default class StreamController {
    #streamUrl;
    #token;
    #streamer = {};
    #viewer = [];
    #room;
    #user;
    #webcamEnabled = false;
    #displayEnabled = false;
    #fetcher;

    constructor(fetcher, alert, user, room, token, streamUrl) {
        this.#fetcher = fetcher;
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
        }
    }

    async #startStream(type) {
        try {
            this.#streamer[type] = new Streamer(this.#streamUrl, this.#user, this.#token);
            const video = await this.#streamer[type].start(type, type);
            video.onclick = () => { this.focus(video) }
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

    async joinModal(userId, streamName) {
        if (this.#room.voiceController.getActiveRoom() && this.#user.id != userId) {
            const displayName = (await this.#fetcher.fetchCore(`/user/${userId}`)).displayName;
            const streamContainter = document.getElementById('stream-container');
            const modal = document.createElement('div');
            modal.id = `stream-modal-${userId}-${streamName}`;
            modal.className = "player join";
            modal.dataset.i18n = "stream.join.button"
            modal.dataset.i18nValue = displayName
            modal.innerText = i18n.translateOne(modal.dataset.i18n, [displayName])
            modal.onclick = () => { modal.remove(); this.join(userId, streamName) }
            streamContainter.appendChild(modal);
        }
    }

    removeModal(userId, streamName) {
        const modal = document.getElementById(`stream-modal-${userId}-${streamName}`);
        if (modal) {
            modal.remove();
        }
    }

    async join(userId, streamName) {
        if (this.#room.voiceController.getActiveRoom() && userId != this.#user.id) {
            this.#viewer[`${userId}-${streamName}`] = new Viewer(this.#streamUrl, this.#token);
            const video = await this.#viewer[`${userId}-${streamName}`].join(userId, streamName);
            video.onclick = () => { this.focus(video) }
        }
    }

    async leave(userId, streamName) {
        if (this.#room.voiceController.getActiveRoom() && userId != this.#user.id) {
            if (this.#viewer[`${userId}-${streamName}`]) {
                await this.#viewer[`${userId}-${streamName}`].leave();
            }
            else {
                this.removeModal(userId, streamName);
            }
        }
    }

    async stopAll() {
        // Stop streaming
        document.getElementById("stream-webcam").classList.remove("green");
        document.getElementById("stream-display").classList.remove("green");
        this.#stopStream("webcam");
        this.#stopStream("display");
        this.#displayEnabled = false;
        this.#webcamEnabled = false;

        // Stop watching
        for (const key of Object.keys(this.#viewer)) {
            await this.#viewer[key].leave();
        }
    }

    async availableStream(roomId) {
        const result = await this.#fetcher.fetchCore(`/room/${roomId}/user`, 'GET');

        if (result.connectedUser === null) {
            console.debug("Stream : No user in room");
            return;
        }

        for (const user of result.connectedUser) {
            for (const stream of user.streams) {
                this.joinModal(stream.user, stream.streamName);
            }
        }
    }

    focus(element) {
        for (const child of element.parentElement.children) {
            child.classList.add("hidden");
        }
        element.classList.remove("hidden");
        element.parentElement.classList.add("fullscreen");
        element.onclick = () => { this.unfocus(element); }
    }

    unfocus(element) {
        for (const child of element.parentElement.children) {
            child.classList.remove("hidden");
        }
        element.parentElement.classList.remove("fullscreen");
        element.onclick = () => { this.focus(element); }
    }
}
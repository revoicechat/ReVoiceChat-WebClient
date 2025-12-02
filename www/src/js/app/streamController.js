import { Streamer, Viewer } from "./stream.js";
import { i18n } from "../lib/i18n.js";

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
    #contextMenu;

    constructor(fetcher, alert, user, room, token, streamUrl) {
        this.#fetcher = fetcher;
        this.#streamUrl = streamUrl;
        this.#token = token;
        this.#room = room;
        this.#user = user;
        this.#contextMenu = document.getElementById('stream-context-menu');
    }

    attachEvents() {
        document.getElementById("stream-webcam").onclick = () => this.#toggleStream("webcam");
        document.getElementById("stream-display").onclick = () => this.#toggleStream("display");
        addEventListener("beforeunload", () => { this.stopAll() })
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
            const div = document.createElement('div');
            this.#streamer[type] = {
                stream: new Streamer(this.#streamUrl, this.#user, this.#token),
                div: div
            }

            const player = await this.#streamer[type].stream.start(type, type);

            div.className = "player";
            div.appendChild(player);
            div.onclick = () => { this.focus(div) }
            div.oncontextmenu = (event) => { event.preventDefault(); }

            document.getElementById('stream-container').appendChild(div);
        }
        catch (error) {
            console.error(error);
        }
    }

    async #stopStream(type) {
        if (this.#streamer[type]) {
            await this.#streamer[type].stream.stop();
            this.#streamer[type].div.remove();
            this.#streamer[type] = null;
        }
    }

    /**
     * @param {StreamingRepresentation|StreamRepresentation} stream
     * @return {Promise<void>}
     */
    async joinModal(stream) {
        const userId = stream.user;
        const streamName = stream.streamName;

        if (this.#room.voiceController.getActiveRoom() && this.#user.id != userId && !this.#viewer[`${userId}-${streamName}`]) {
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
            const div = document.createElement('div');

            this.#viewer[`${userId}-${streamName}`] = {
                stream: new Viewer(this.#streamUrl, this.#token),
                div: div
            } 

            const stream = this.#viewer[`${userId}-${streamName}`].stream;
            const video = await stream.join(userId, streamName);

            div.className = "player";
            div.appendChild(video);
            div.onclick = () => { this.focus(div) }
            div.oncontextmenu = (event) => {
                event.preventDefault();
                this.#contextMenu.load(stream, this, userId, streamName);
                this.#contextMenu.open(event.clientX, event.clientY)
            }

            // Streamer container
            document.getElementById('stream-container').appendChild(div); 
        }
    }

    /**
     * @param {StreamingRepresentation} stream
     * @return {Promise<void>}
     */
    async leave(stream) {
        const userId = stream.user;
        const streamName = stream.name;

        if (this.#room.voiceController.getActiveRoom() && userId != this.#user.id) {
            if (this.#viewer[`${userId}-${streamName}`]) {
                await this.#viewer[`${userId}-${streamName}`].stream.leave();
                this.#viewer[`${userId}-${streamName}`].div.remove();
                this.#viewer[`${userId}-${streamName}`] = null;
            }
            else {
                this.removeModal(userId, streamName);
            }
        }

        this.availableStream(this.#room.voiceController.getActiveRoom());
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
            await this.#viewer[key].stream.leave();
            this.#viewer[key].div.remove();
            this.#viewer[key] = null;
        }
    }

    async availableStream(roomId) {
        /** @type {RoomPresence} */
        const result = await this.#fetcher.fetchCore(`/room/${roomId}/user`, 'GET');

        if (result && result.connectedUser === null) {
            console.debug("Stream : No user in room");
            return;
        }

        for (const user of result.connectedUser) {
            for (const stream of user.streams) {
                this.joinModal(stream);
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
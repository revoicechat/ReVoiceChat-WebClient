import { Streamer, Viewer } from "./stream.js";
import { i18n } from "../lib/i18n.js";
import { SwalCustomClass } from "../lib/tools.js";
import Swal from '../lib/sweetalert2.esm.all.min.js';
import CoreServer from "./core/core.server.js";
import ReVoiceChat from "./revoicechat.js";
import Codec from "./codec.js";

export default class StreamController {
    #streamer = {};
    #viewer = [];
    #room;
    #user;
    #webcamEnabled = false;
    #displayEnabled = false;
    #contextMenu;

    constructor(user, room) {
        this.#room = room;
        this.#user = user;
        this.#contextMenu = document.getElementById('stream-context-menu');
    }

    attachEvents() {
        document.getElementById("stream-webcam").onclick = () => this.#toggleStream("webcam");
        document.getElementById("stream-display").onclick = () => this.#toggleStream("display");
        window.addEventListener("beforeunload", async () => {
            await this.stopAll()
        })
    }

    #toggleStream(type) {
        if (type == "webcam") {
            if (this.#webcamEnabled) {
                this.#stopStream("webcam");
            } else {
                this.#startWebcam();
            }
            return;
        }

        if (type == "display") {
            if (this.#displayEnabled) {
                this.#stopStream("display");
            } else {
                this.#startDisplay();
            }
        }
    }

    async #startDisplay() {
        try {
            const div = document.createElement('div');
            this.#streamer["display"] = {
                stream: new Streamer(CoreServer.streamUrl(), this.#user, ReVoiceChat.getToken()),
                div: div
            }

            let resolution = 'HD';
            let framerate = '30';
            let codec = 'AUTO';
            Swal.fire({
                title: i18n.translateOne("stream.modal.title"),
                animation: false,
                customClass: SwalCustomClass,
                showCancelButton: true,
                focusConfirm: false,
                confirmButtonText: i18n.translateOne("stream.modal.confirm"),
                cancelButtonText: i18n.translateOne("stream.modal.cancel"),
                allowOutsideClick: false,
                html: `
                        <form class='popup' id='popup-stream'>
                            <label data-i18n="stream.modal.resolution">Resolution</label>
                            <select id='popup-resolution'>
                                <option value='HD' selected>HD (720p)</option>
                                <option value='FHD'>FullHD (1080p)</option>
                                <option value='QHD'>QuadHD (1440p)</option>
                                <option value='UHD'>UltraHD (2160p)</option>
                            </select>

                            <label data-i18n="stream.modal.framerate">Framerate</label>
                            <select id='popup-framerate'>
                                <option value='10'>10</option>
                                <option value='30' selected>30 (default)</option>
                                <option value='60'>60</option>
                            </select>

                            <label data-i18n="stream.modal.codec">Codec</label>
                            <select id='popup-codec'>
                                <option value='AUTO' selected>Auto</option>
                                <option value='VP9'>${i18n.translateOne("stream.modal.vp9")}</option>
                                <option value='AV1'>${i18n.translateOne("stream.modal.av1")}</option>
                            </select>
                        </form>`,
                didOpen: () => {
                    i18n.translatePage(document.getElementById("popup-stream"))
                    document.getElementById('popup-resolution').oninput = () => { resolution = document.getElementById('popup-resolution').value };
                    document.getElementById('popup-framerate').oninput = () => { framerate = document.getElementById('popup-framerate').value };
                    document.getElementById('popup-codec').oninput = () => { codec = document.getElementById('popup-codec').value };
                }
            }).then(async (result) => {
                if (result.value) {
                    const player = await this.#streamer["display"].stream.start("display", await Codec.streamConfig(resolution, framerate, codec));

                    div.className = "player";
                    div.appendChild(player);
                    div.onclick = () => {
                        this.focus(div)
                    }
                    div.oncontextmenu = (event) => {
                        event.preventDefault();
                    }
                    document.getElementById('stream-container').appendChild(div);

                    this.#displayEnabled = true;
                    document.getElementById("stream-display").classList.add("green");
                }
            });
        }
        catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: i18n.translateOne("stream.start.error"),
                animation: false,
                customClass: SwalCustomClass,
                showCancelButton: false,
                confirmButtonText: "OK",
                allowOutsideClick: false,
            });
        }
    }

    async #startWebcam() {
        try {
            const div = document.createElement('div');
            this.#streamer["webcam"] = {
                stream: new Streamer(CoreServer.streamUrl(), this.#user, ReVoiceChat.getToken()),
                div: div
            }
            const player = await this.#streamer["webcam"].stream.start("webcam", await Codec.webcamConfig());
            div.className = "player";
            div.appendChild(player);
            div.onclick = () => {
                this.focus(div)
            }
            div.oncontextmenu = (event) => {
                event.preventDefault();
            }
            document.getElementById('stream-container').appendChild(div);
            this.#webcamEnabled = true;
            document.getElementById("stream-webcam").classList.add("green");
        }
        catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: i18n.translateOne("stream.start.error"),
                animation: false,
                customClass: SwalCustomClass,
                showCancelButton: false,
                confirmButtonText: "OK",
                allowOutsideClick: false,
            });
        }
    }

    async #stopStream(type) {
        try {
            if (this.#streamer[type]) {
                await this.#streamer[type].stream.stop();
                this.#streamer[type].div.remove();
                this.#streamer[type] = null;

                if (type === "webcam") {
                    this.#webcamEnabled = false;
                    document.getElementById("stream-webcam").classList.remove("green");

                }

                if (type === "display") {
                    this.#displayEnabled = false;
                    document.getElementById("stream-display").classList.remove("green");
                }
            }
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: i18n.translateOne("stream.start.error"),
                animation: false,
                customClass: SwalCustomClass,
                showCancelButton: false,
                confirmButtonText: "OK",
                allowOutsideClick: false,
            });
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
            const displayName = (await CoreServer.fetch(`/user/${userId}`)).displayName;
            const streamContainter = document.getElementById('stream-container');
            const modal = document.createElement('div');
            modal.id = `stream-modal-${userId}-${streamName}`;
            modal.className = "player join";
            modal.dataset.i18n = "stream.join.button"
            modal.dataset.i18nValue = displayName
            modal.innerText = i18n.translateOne(modal.dataset.i18n, [displayName])
            modal.onclick = () => {
                modal.remove();
                this.join(userId, streamName)
            }
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
                stream: new Viewer(CoreServer.streamUrl(), ReVoiceChat.getToken(), this.#user.settings),
                div: div
            }

            const stream = this.#viewer[`${userId}-${streamName}`].stream;
            const video = await stream.join(userId, streamName);

            div.className = "player";
            div.appendChild(video);
            div.onclick = () => {
                this.focus(div)
            }
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

                const streamContainter = document.getElementById('stream-container');
                streamContainter.className = "stream";
                for (const child of streamContainter.childNodes) {
                    child.classList.remove("hidden");
                }
            } else {
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
            if (this.#viewer[key]) {
                await this.#viewer[key].stream.leave();
                this.#viewer[key].div.remove();
                this.#viewer[key] = null;
            }
        }
    }

    removeAll() {
        document.getElementById('stream-container').innerHTML = "";
    }

    removeAllExceptWatching() {
        const children = document.getElementById('stream-container').childNodes;
        for (const child of children) {
            if (child.className === "player join") {
                child.remove();
            }
        }
    }

    async availableStream(roomId) {
        /** @type {RoomPresence} */
        const result = await CoreServer.fetch(`/room/${roomId}/user`, 'GET');

        if (!result?.connectedUser) {
            console.debug("Stream : No user in room");
            return;
        }

        this.removeAllExceptWatching();

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
        element.onclick = () => {
            this.unfocus(element);
        }
    }

    unfocus(element) {
        for (const child of element.parentElement.children) {
            child.classList.remove("hidden");
        }
        element.parentElement.classList.remove("fullscreen");
        element.onclick = () => {
            this.focus(element);
        }
    }
}
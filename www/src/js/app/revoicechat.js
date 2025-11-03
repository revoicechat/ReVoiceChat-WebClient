import Fetcher from './fetcher.js';
import State from './state.js';
import Alert from './alert.js';
import Router from './router.js';
import User from './user.js';
import Room from './room.js';
import Server from './server.js';
import { reloadEmojis } from '../emoji.js';

export default class ReVoiceChat {
    alert = new Alert();
    router = new Router();
    fetcher;
    user;
    room;
    server;
    state;

    #token;
    #sse;
    coreUrl;
    mediaUrl;
    voiceUrl;

    constructor() {
        // Retrieve URL
        const storedCoreUrl = localStorage.getItem("lastHost");
        if (!storedCoreUrl) {
            document.location.href = `index.html`;
        }

        // Validate URL
        const core = new URL(storedCoreUrl);

        // Store URL
        this.coreUrl = `${core.protocol}//${core.host}`;
        this.mediaUrl = `${core.protocol}//${core.host}/media`;
        this.voiceUrl = `${core.protocol}//${core.host}/api/voice`;

        // Store token
        const storedToken = getCookie("jwtToken");
        if (storedToken) {
            this.#token = storedToken;
        }
        else {
            document.location.href = `index.html`;
        }

        // Instantiate other classes
        this.fetcher = new Fetcher(this.#token, this.coreUrl, this.mediaUrl);
        this.user = new User(this.fetcher, this.mediaUrl);
        this.room = new Room(this.fetcher, this.alert, this.user, this.voiceUrl, this.#token);
        this.server = new Server(this.fetcher, this.mediaUrl, this.room);
        this.state = new State(this);

        // Save state before page unload
        addEventListener("beforeunload", () => {
            this.state.save();
            this.#closeSSE();
        })
    }

    // Token
    getToken() {
        return this.#token;
    }

    // Server Send Event
    openSSE() {
        this.#closeSSE();

        this.#sse = new EventSource(`${this.coreUrl}/api/sse?jwt=${this.#token}`);

        this.#sse.onmessage = (event) => {
            event = JSON.parse(event.data);
            const type = event.type;
            const data = event.data;

            console.debug("SSE : ", event);

            switch (type) {
                case "PING":
                    return;

                case "SERVER_UPDATE":
                    this.server.update(data);
                    return;

                case "ROOM_UPDATE":
                    this.room.update(data, this.server.id);
                    return;

                case "ROOM_MESSAGE":
                    this.room.textController.message(data);
                    return;

                case "DIRECT_MESSAGE":
                    return;

                case "USER_STATUS_CHANGE":
                    return;

                case "USER_UPDATE":
                    this.user.update(data);
                    return;

                case "VOICE_JOINING":
                    this.room.voiceController.userJoining(data);
                    return;

                case "VOICE_LEAVING":
                    this.room.voiceController.userLeaving(data);
                    return;
                case "EMOTE_UPDATE":
                    reloadEmojis()
                    return;
                default:
                    console.error("SSE type unknowned: ", type);
                    return;
            }
        };

        this.#sse.onerror = () => {
            console.error(`An error occurred while attempting to connect to "${this.coreUrl}/api/sse".\nRetry in 10 seconds`);
            setTimeout(() => {
                this.openSSE();
                this.room.textController.getAllFrom(this.room.id);
            }, 10000);
        }
    }

    #closeSSE() {
        if (this.#sse) {
            this.#sse.close();
            this.#sse = null;
        }
    }

}

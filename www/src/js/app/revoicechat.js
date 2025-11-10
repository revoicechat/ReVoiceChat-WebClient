import Fetcher from './fetcher.js';
import State from './state.js';
import Alert from './alert.js';
import Router from './router.js';
import User from './user.js';
import Room from './room.js';
import Server from './server.js';
import {reloadEmojis} from '../emoji.js';
import {Sse} from "./sse.js";

export default class ReVoiceChat {
    alert;
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
        this.user = new User(this.fetcher, this.mediaUrl, this.coreUrl);
        this.alert = new Alert(this.user.settings);
        this.room = new Room(this.fetcher, this.alert, this.user, this.voiceUrl, this.#token);
        this.server = new Server(this.fetcher, this.mediaUrl, this.room);
        this.state = new State(this);
        
        // Add missing classes
        this.user.settings.setRoom(this.room);

        this.#sse = new Sse(
            this.#token,
            this.coreUrl,
            (data) => this.#handleSSEMessage(data),
            () => this.#handleSSEError()
        )

        // Save state before page unload
        addEventListener("beforeunload", () => {
            this.state.save();
            this.#sse.closeSSE();
        })
    }

    // Token
    getToken() {
        return this.#token;
    }

    // Server Send Event avec JWT en header
    openSSE() {
        this.#sse.openSSE()
    }

    #handleSSEMessage(data) {
        try {
            const event = JSON.parse(data);
            const type = event.type;
            const eventData = event.data;

            console.debug("SSE : ", event);

            switch (type) {
                case "PING":
                    return;

                case "SERVER_UPDATE":
                    this.server.update(eventData);
                    return;

                case "ROOM_UPDATE":
                    this.room.update(eventData, this.server.id);
                    return;

                case "ROOM_MESSAGE":
                    this.room.textController.message(eventData);
                    return;

                case "DIRECT_MESSAGE":
                    return;

                case "USER_STATUS_CHANGE":
                    return;

                case "USER_UPDATE":
                    this.user.update(eventData);
                    return;

                case "VOICE_JOINING":
                    this.room.voiceController.userJoining(eventData);
                    return;

                case "VOICE_LEAVING":
                    this.room.voiceController.userLeaving(eventData);
                    return;

                case "EMOTE_UPDATE":
                    reloadEmojis();
                    return;

                case "RISK_MANAGEMENT":
                    this.server.settings.riskModify();
                    return;

                default:
                    console.error("SSE type unknowned: ", type);
                    return;
            }
        } catch (error) {
            console.error('Error parsing SSE message:', error, data);
        }
    }

    #handleSSEError() {
        console.error(`An error occurred while attempting to connect to "${this.coreUrl}/api/sse".\nRetry in 10 seconds`);
        setTimeout(() => {
            this.openSSE();
            this.room.textController.getAllFrom(this.room.id);
        }, 10000);
    }
}

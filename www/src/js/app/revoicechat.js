import Fetcher from './fetcher.js';
import State from './state.js';
import Alert from './alert.js';
import Router from './router.js';
import User from './user.js';
import Room from './room.js';
import Server from './server.js';
import { reloadEmojis } from '../emoji.js';
import { Sse } from "./sse.js";

export default class ReVoiceChat {
    /** @type {Alert} */
    alert;
    /** @type {Router} */
    router = new Router();
    /** @type {Fetcher} */
    fetcher;
    /** @type {User} */
    user;
    /** @type {Room} */
    room;
    /** @type Server */
    server;
    /** @type {State} */
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
        this.streamUrl = `${core.protocol}//${core.host}/api/stream`;

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
        this.room = new Room(this.fetcher, this.alert, this.user, this.voiceUrl, this.#token, this.mediaUrl, this.streamUrl);
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
        this.sseHandlers = new SSEHandlers(this);

        // Save state before page unload
        addEventListener("beforeunload", () => {
            this.state.save();
            this.#sse.closeSSE();
        })

        // Load more when document is fully loaded
        document.addEventListener('DOMContentLoaded', () => this.#load());
    }

    async #load() {
        await this.user.load();
        await this.user.settings.load();
        this.state.load();
        this.#sse.openSSE()
        this.room.textController.attachEvents();
        this.room.voiceController.attachEvents();
        this.alert.attachEvents();
        this.router.routeTo(getQueryVariable('r'));
        await i18n.translate(this.user.settings.getLanguage());
    }

    // Token
    getToken() {
        return this.#token;
    }

    #handleSSEMessage(data) {
        try {
            const event = JSON.parse(data);
            console.debug("SSE : ", event);
            this.sseHandlers.handle(event.type, event.data);
        } catch (error) {
            console.error('Error parsing SSE message:', error, data);
        }
    }

    #handleSSEError() {
        console.error(`An error occurred while attempting to connect to "${this.coreUrl}/api/sse".\nRetry in 10 seconds`);
        setTimeout(() => {
            this.#sse.openSSE();
            this.room.textController.getAllFrom(this.room.id);
        }, 10000);
    }
}

class SSEHandlers {
    /** @param {ReVoiceChat} context */
    constructor(context) {
        this.context = context;
        this.server = context.server;
        this.room = context.room;
        this.user = context.user;

        this.handlers = {
            'PING': () => { },
            'SERVER_UPDATE': (data) => this.server.update(data),
            'ROOM_UPDATE': (data) => this.room.update(data, this.server.id),
            'ROOM_MESSAGE': (data) => this.room.textController.message(data),
            'DIRECT_MESSAGE': () => { },
            'NEW_USER_IN_SERVER': (data) => this.server.updateUserInServer(data),
            'USER_STATUS_UPDATE': (data) => this.user.setStatus(data),
            'USER_UPDATE': (data) => this.user.update(data),
            'VOICE_JOINING': (data) => this.room.voiceController.userJoining(data),
            'VOICE_LEAVING': (data) => this.room.voiceController.userLeaving(data),
            'EMOTE_UPDATE': () => reloadEmojis(),
            'RISK_MANAGEMENT': () => this.server.settings.riskModify(),
            'STREAM_START': (data) => this.room.voiceController?.streamController?.joinModal(data.user, data.name),
            'STREAM_STOP': (data) => this.room.voiceController?.streamController?.leave(data.user, data.name)
        };
    }

    handle(type, data) {
        const handler = this.handlers[type];
        if (handler) {
            handler(data);
        } else {
            console.error("SSE type unknown: ", type);
        }
    }
}

window.RVC = new ReVoiceChat();
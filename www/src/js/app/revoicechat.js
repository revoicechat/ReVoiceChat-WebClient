import Fetcher from './fetcher.js';
import State from './state.js';
import Alert from './utils/alert.js';
import Router from './router.js';
import UserController from './user.controller.js';
import Room from './room.js';
import ServerController from './server.controller.js';
import MobileController from "./utils/mobile.js";
import {reloadEmojis} from './emoji.js';
import {Sse} from "./sse.js";
import {getCookie, getQueryVariable} from "../lib/tools.js";
import '../component/components.js';
import {i18n} from "../lib/i18n.js";
import MediaServer from "./media/media.server.js";

export default class ReVoiceChat {
    /** @type {Router} */
    router = new Router();
    /** @type {Fetcher} */
    fetcher;
    /** @type {UserController} */
    user;
    /** @type {Room} */
    room;
    /** @type ServerController */
    server;
    /** @type {State} */
    state;
    /** @type {string} */
    #token;
    /** @type {Sse} */
    #sse;
    /** @type {string} */
    coreUrl;
    /** @type {string} */
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
        MediaServer.init(core);
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
        this.fetcher = new Fetcher(this.coreUrl);
        this.user = new UserController(this.fetcher);
        this.room = new Room(this.fetcher, this.user, this.voiceUrl, this.#token, this.streamUrl);
        this.server = new ServerController(this.fetcher, this.room);
        this.state = new State(this);

        // Add missing classes
        this.user.settings.setRoom(this.room);

        this.#sse = new Sse(
            this.#token,
            this.coreUrl,
            (data) => this.#handleSSEMessage(data),
            () => this.#handleSSEError()
        )
        /** @type {SSEHandlers} */
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
        MobileController.load();
        await this.user.load();
        await this.user.settings.load();
        this.state.load();
        this.#sse.openSSE()
        this.room.textController.attachEvents();
        this.room.voiceController.attachEvents();
        Alert.attachEvents();
        this.router.routeTo(getQueryVariable('r'));
        await i18n.translate(this.user.settings.getLanguage());
    }

    /** @return {string} Token */
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
            void this.room.textController.getAllFrom(this.room.id);
        }, 10000);
    }

    userSettings() {
        return this.user.settings
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
            'STREAM_START': (data) => this.room.voiceController?.streamController?.joinModal(data),
            'STREAM_STOP': (data) => this.room.voiceController?.streamController?.leave(data)
        };
    }

    handle(type, data) {
        const handler = this.handlers[type];
        if (handler) {
            handler(data);
        } else {
            console.warn("SSE type unknown: ", type);
        }
    }
}

window.RVC = new ReVoiceChat();

import {ServerSettingsOverviewController} from "./server.settings.overview.controller.js";
import {ServerSettingsRoomController} from "./server.settings.room.controller.js";
import {ServerSettingsEmoteController} from "./server.settings.emote.controller.js";
import {ServerSettingsInvitationController} from "./server.settings.invitation.controller.js";
import {ServerSettingsRoleController} from "./server.settings.role.controller.js";
import {ServerSettingsMemberController} from "./server.settings.member.controller.js";

export default class ServerSettingsController {
    /** @type {ServerController} */
    server;
    /** @type {Fetcher} */
    #fetcher;
    currentTab;
    /** @type {string[]} */
    flattenRisks = [];

    /**
     * @param {ServerController} server
     * @param {Fetcher} fetcher
     * @param {string} mediaUrl
     */
    constructor(server, fetcher, mediaUrl) {
        this.server = server;
        this.#fetcher = fetcher;
        this.overview = new ServerSettingsOverviewController(this, fetcher)
        this.member = new ServerSettingsMemberController(this, fetcher, mediaUrl)
        this.room = new ServerSettingsRoomController(this, fetcher)
        this.emote = new ServerSettingsEmoteController(this, fetcher)
        this.invitation = new ServerSettingsInvitationController(this, fetcher)
        this.role = new ServerSettingsRoleController(this)
    }

    load() {
        void this.#loadRisks();
        this.overview.load();
        this.member.load();
    }

    riskModify() {
        void this.#loadRisks(false);
        void this.server.room.load(this.server.id)
    }

    /**
     * @param {boolean} select
     * @return {Promise<void>}
     */
    async #loadRisks(select = true) {
        /** @type {UserRepresentation} */
        const me = await this.#fetcher.fetchCore(`/user/me`);
        const isAdmin = me.type === "ADMIN";
        /** @type {string[]} */
        const flattenRisks = await this.#fetcher.fetchCore(`/user/server/${this.server.id}/risks`);

        this.flattenRisks = flattenRisks;
        this.#selectEventHandler(flattenRisks, isAdmin);
        void this.#attachEventsFromRisks(flattenRisks, isAdmin);

        if (select) {
            this.select('overview');
        }
    }

    /**
     * @param {string[]} flattenRisks
     * @param {boolean} isAdmin
     * @return {Promise<void>}
     */
    async #attachEventsFromRisks(flattenRisks, isAdmin) {
        this.overview.handleRisks(isAdmin, flattenRisks);
        this.room.handleRisks(isAdmin, flattenRisks);
        this.role.handleRisks(isAdmin, flattenRisks);
        this.emote.handleRisks(isAdmin, flattenRisks);
        this.invitation.handleRisks(isAdmin, flattenRisks);
    }
    /**
     * @param {string} name
     */
    select(name) {
        if (this.currentTab) {
            document.getElementById(`server-setting-tab-${this.currentTab}`).classList.remove("active");
            document.getElementById(`server-setting-content-${this.currentTab}`).classList.add("hidden");
        }

        this.currentTab = name;
        document.getElementById(`server-setting-tab-${this.currentTab}`).classList.add('active');
        document.getElementById(`server-setting-content-${this.currentTab}`).classList.remove('hidden');
    }

    /**
     * @param {string[]} flattenRisks
     * @param {boolean} isAdmin
     */
    #selectEventHandler(flattenRisks, isAdmin) {
        const parameters = [
            { button: 'overview', risks: null },
            { button: 'rooms', risks: ['SERVER_ROOM_UPDATE', 'SERVER_ROOM_DELETE'] },
            { button: 'roles', risks: ['UPDATE_ROLE', 'ADD_USER_ROLE', 'ADD_ROLE'] },
            { button: 'emotes', risks: ['UPDATE_EMOTE', 'REMOVE_EMOTE', 'ADD_EMOTE'] },
            { button: 'members', risks: null },
            { button: 'invitations', risks: ['SERVER_INVITATION_ADD', 'SERVER_INVITATION_FETCH'] }
        ]

        for (const param of parameters) {
            const button = document.getElementById(`server-setting-tab-${param.button}`);

            if (isAdmin || param.risks) {
                if (isAdmin || flattenRisks.some(elem => param.risks.includes(elem))) {
                    button.classList.remove('hidden');
                    button.onclick = () => this.select(param.button);
                }
                else {
                    button.classList.add('hidden');
                    button.onclick = null;
                }
            } else {
                button.classList.remove('hidden');
                button.onclick = () => this.select(param.button);
            }
        }
    }
}
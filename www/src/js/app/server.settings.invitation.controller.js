import {copyToClipboard} from "../lib/tools.js";
import CoreServer from "./core/core.server.js";
import Modal from "../component/modal.component.js";

export class ServerSettingsInvitationController {
    /**
     * @param {ServerSettingsController} serverSettings
     */
    constructor(serverSettings) {
        this.serverSettings = serverSettings
    }

    /**
     * @param {string[]} flattenRisks
     * @param {boolean} isAdmin
     */
    handleRisks(isAdmin, flattenRisks) {
        const invitationRisks = new Set(['SERVER_INVITATION_ADD', 'SERVER_INVITATION_FETCH']);
        if (isAdmin || flattenRisks.some(elem => invitationRisks.has(elem))) {
            void this.#invitationLoad();
            document.getElementById('server-setting-invitation-create').onclick = () => this.#invitationCreate();
        } else {
            document.getElementById('server-setting-invitation-create').onclick = null;
            if (this.serverSettings.currentTab === "invitations") {
                this.serverSettings.select('overview');
            }
        }
    }

    async #invitationLoad() {
        const serverId = this.serverSettings.server.id;

        /** @type {InvitationRepresentation[]} */
        const result = await CoreServer.fetch(`/invitation/server/${serverId}`, 'GET');

        if (result) {
            const list = document.getElementById("server-setting-invitation");
            list.innerHTML = "";

            for (const invitation of result) {
                if (invitation.status === 'CREATED') {
                    list.appendChild(this.#invitationCreateItem(invitation));
                }
            }
        }
    }

    async #invitationCreate() {
        const serverId = this.serverSettings.server.id;

        /** @type {InvitationRepresentation} */
        const result = await CoreServer.fetch(`/invitation/server/${serverId}`, 'POST');
        
        if (result.status === "CREATED") {
            void this.#invitationLoad();
            await Modal.toggle({
                title: `New invitation`,
                html: `<input class='modal-input' type='text' value='${result.id}' readonly>`,
                animation: false,
                showCancelButton: false,
                confirmButtonText: "OK",
                allowOutsideClick: false,
            })
        }
    }

    /**
     * @param {InvitationRepresentation} data
     * @return {HTMLDivElement}
     */
    #invitationCreateItem(data) {
        const DIV = document.createElement('div');
        DIV.id = data.id;
        DIV.className = "config-item";

        // Name
        const DIV_NAME = document.createElement('div');
        DIV_NAME.className = "name invitation";
        DIV_NAME.innerText = `${data.id}`;
        DIV.appendChild(DIV_NAME);

        // Context menu
        const DIV_CM = document.createElement('div');
        DIV_CM.className = "context-menu";
        DIV_CM.appendChild(this.#createContextMenuButton("icon", "<revoice-icon-clipboard></revoice-icon-clipboard>", () => this.#invitationCopy(data.id)));
        DIV_CM.appendChild(this.#createContextMenuButton("icon", "<revoice-icon-trash></revoice-icon-trash>", () => this.#invitationDelete(data)));
        DIV.appendChild(DIV_CM);

        return DIV;
    }

    /** @param {InvitationRepresentation} data */
    #invitationDelete(data) {
        Modal.toggle({
            title: `Delete invitation '${data.id}'`,
            showCancelButton: true,
            focusCancel: true,
            confirmButtonText: "Delete",
            confirmButtonClass: "danger",
        }).then(async (result) => {
            if (result.isConfirmed) {
                await CoreServer.fetch(`/invitation/${data.id}`, 'DELETE');
                void this.#invitationLoad();
            }
        });
    }

    /** @param {string} link */
    #invitationCopy(link) {
        void copyToClipboard(link);
    }

    /**
     * @param {string} className
     * @param {string} innerHTML
     * @param {() => void} onclick
     * @param {string} title
     * @return {HTMLDivElement}
     */
    #createContextMenuButton(className, innerHTML, onclick, title = "") {
        const DIV = document.createElement('div');
        DIV.className = className;
        DIV.innerHTML = innerHTML;
        DIV.onclick = onclick;
        DIV.title = title;
        return DIV;
    }
}
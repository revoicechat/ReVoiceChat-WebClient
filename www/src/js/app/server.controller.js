import ServerSettingsController from "./server.settings.controller.js";
import { statusToColor } from "../lib/tools.js";
import MediaServer from "./media/media.server.js";
import CoreServer from "./core/core.server.js";
import { i18n } from "../lib/i18n.js";
import Modal from "../component/modal.component.js";
import Router from "./router.js";

export default class ServerController {
    /** @type {Room} */
    room;
    /** @type {string} */
    id;
    /** @type {string} */
    name;
    /** @type {ServerSettingsController} */
    settings;

    #popupData = null;

    /**
     * @param {Room} room
     */
    constructor(room, router) {
        this.room = room;
        this.router = router;
    }

    async load() {
        /** @type {ServerRepresentation[]} */
        const result = await CoreServer.fetch("/server", 'GET');

        if (result === null) {
            return;
        }

        // Create instances list
        const instancesList = document.getElementById('instances');
        for (const instance of result) {
            const element = await this.#createInstanceElement(instance);
            if (element) {
                instancesList.appendChild(element);
            }
        }
        instancesList.appendChild(this.#currentJoinInstanceElement());
        instancesList.appendChild(this.#createDiscorverInstanceElement());

        // Select default server
        if (this.id) {
            this.select(this.id, this.name);
        } else {
            const server = result[0]
            this.select(server.id, server.name);
        }

        this.settings = new ServerSettingsController(this);
    }

    async #createInstanceElement(instance) {
        if (instance === undefined || instance === null) {
            return;
        }

        const BUTTON = document.createElement('button');

        BUTTON.id = instance.id;
        BUTTON.className = "element";
        BUTTON.title = instance.name;
        BUTTON.onclick = () => this.select(instance.id, instance.name);

        const IMG = document.createElement('img');
        IMG.src = MediaServer.profiles(instance.id);
        IMG.className = "icon";
        IMG.dataset.id = instance.id;
        BUTTON.appendChild(IMG);

        return BUTTON;
    }

    #currentJoinInstanceElement() {
        const BUTTON = document.createElement('button');

        BUTTON.className = "element";
        BUTTON.title = i18n.translateOne("server.join.title");
        BUTTON.onclick = () => this.#join();

        const IMG = document.createElement('revoice-icon-circle-plus');
        IMG.className = "icon";
        BUTTON.appendChild(IMG);

        return BUTTON;
    }

    #createDiscorverInstanceElement() {
        const BUTTON = document.createElement('button');

        BUTTON.className = "element";
        BUTTON.title = i18n.translateOne("server.discover.title");
        BUTTON.onclick = () => this.#discover();

        const IMG = document.createElement('revoice-icon-telescope');
        IMG.className = "icon";
        BUTTON.appendChild(IMG);

        return BUTTON;
    }

    #join() {
        Modal.toggle({
            title: i18n.translateOne("server.join.title"),
            focusConfirm: false,
            confirmButtonText: i18n.translateOne("server.join.confirm"),
            showCancelButton: true,
            cancelButtonText: i18n.translateOne("server.join.cancel"),
            width: "30rem",
            html: `
            <form class='popup'>
                <div>
                    <label for="invitation" data-i18n="login.host">${i18n.translateOne("server.join.invitation")}</label>
                    <br/>
                    <input type="text" name="host" id="invitation">
                </div>
            </form>`,
            didOpen: () => {
                document.getElementById('invitation').oninput = () => { this.#popupData = document.getElementById('invitation').value };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                await CoreServer.fetch(`/server/join/${this.#popupData}`, 'POST');
            }
        });
    }

    #discover() {
        Modal.toggle({
            title: i18n.translateOne("server.discover.title"),
            focusConfirm: false,
            confirmButtonText: i18n.translateOne("server.join.confirm"),
            showCancelButton: true,
            cancelButtonText: i18n.translateOne("server.join.cancel"),
            width: "30rem",
            html: `
            <form class='popup'>
                <div>
                    <select id='modal-serverId'>
                        <option value=null selected disabled> - Select a server - </option>
                    </select>
                </div>
            </form>`,
            didOpen: async () => {
                const select = document.getElementById('modal-serverId');
                select.oninput = () => { this.#popupData = select.value };

                const publicServers = await CoreServer.fetch('/server/discover');
                for(const instance of publicServers){
                    const option = document.createElement('option');
                    option.value = instance.id;
                    option.innerHTML = instance.name;
                    select.appendChild(option);
                }
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                await CoreServer.fetch(`/server/${this.#popupData}/join/`, 'POST');
            }
        });
    }

    select(id, name) {
        if (!id || !name) {
            console.error("Server id or name is null or undefined");
            return;
        }

        const currentInstance = document.getElementById(this.id);
        if (currentInstance) {
            currentInstance.classList.remove('active');
        }

        document.getElementById(id).classList.add('active');

        this.#updateServerName(id, name);
        this.#usersLoad();
        this.room.load(id);
        this.router.routeTo(Router.APP);
    }

    #updateServerName(id, name) {
        this.id = id;
        this.name = name;
        document.getElementById("server-name").innerText = name;
        document.getElementById("server-picture").src = MediaServer.profiles(id);
    }

    /** @param {ServerUpdateNotification} data */
    update(data) {
        switch (data.action) {
            case "ADD":
                break;
            case "REMOVE":
                break;
            case "MODIFY": {
                if (data.server.id === this.id) {
                    this.#updateServerName(this.id, data.server.name);
                    this.room.load(this.id);
                }
                return;
            }
            default:
                return;
        }
    }

    /** @param {NewUserInServer} data */
    updateUserInServer(data) {
        if (this.id === data.server) {
            this.#usersLoad();
        }
    }

    async #usersLoad() {
        /** @type {UserRepresentation[]} */
        const result = await CoreServer.fetch(`/server/${this.id}/user`, 'GET');

        if (result !== null) {
            const sortedByDisplayName = [...result].sort((a, b) => {
                return a.displayName.localeCompare(b.displayName);
            });

            const sortedByStatus = [...sortedByDisplayName].sort((a, b) => {
                if (a.status === b.status) {
                    return 0;
                }
                else {
                    if (a.status === "OFFLINE") {
                        return 1;
                    }
                    if (b.status === "OFFLINE") {
                        return -1;
                    }
                }
            });

            const userList = document.getElementById("user-list");
            userList.innerHTML = "";

            for (const user of sortedByStatus) {
                userList.appendChild(await this.#createUser(user));
            }
        }
    }

    /**
     * @param  {UserRepresentation} data
     * @return {Promise<HTMLDivElement>}
     */
    async #createUser(data) {
        const id = data.id;
        const name = data.displayName;
        const status = data.status;
        const profilePicture = MediaServer.profiles(id);

        const DIV = document.createElement('div');
        DIV.id = id;
        DIV.className = `${id} user-profile`
        DIV.innerHTML = `
            <div class="relative">
                <img src="${profilePicture}" alt="PFP" class="icon ring-2" data-id="${id}" name="user-picture-${id}" />
                <revoice-dot name="dot-${id}" type="status" color="${statusToColor(status)}"></revoice-dot>
            </div>
            <div class="user">
                <h2 class="name" name="user-name-${id}">${name}</h2>
            </div>
        `;

        return DIV;
    }
}
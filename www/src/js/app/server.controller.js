import ServerSettingsController from "./server.settings.controller.js";
import { statusToDotClassName } from "../lib/tools.js";
import MediaServer from "./media/media.server.js";
import CoreServer from "./core/core.server.js";

export default class ServerController {
    /** @type {Room} */
    room;
    /** @type {string} */
    id;
    /** @type {string} */
    name;
    /** @type {ServerSettingsController} */
    settings;

    /**
     * @param {Room} room
     */
    constructor(room) {
        this.room = room;
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
        BUTTON.appendChild(IMG);

        return BUTTON;
    }

    select(id, name) {
        if (!id || !name) {
            console.error("Server id or name is null or undefined");
            return;
        }

        const currentInstance = document.getElementById(this.id);
        if (currentInstance){
            currentInstance.classList.remove('active');
        }

        document.getElementById(id).classList.add('active');

        this.#updateServerName(id, name);
        this.#usersLoad();
        this.room.load(id);
    }

    #updateServerName(id, name) {
        this.id = id;
        this.name = name;
        document.getElementById("server-name").innerText = name;
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
                <img src="${profilePicture}" alt="PFP" class="icon ring-2" name="user-picture-${id}" />
                <div id="dot-${id}" class="user-dot ${statusToDotClassName(status)}"></div>
            </div>
            <div class="user">
                <h2 class="name" name="user-name-${id}">${name}</h2>
            </div>
        `;

        return DIV;
    }
}
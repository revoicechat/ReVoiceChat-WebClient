import ServerSettingsController from "./server.settings.controller.js";
import {statusToDotClassName} from "../lib/tools.js";
import MediaServer from "./media/media.server.js";

export default class ServerController {
    /** @type {Fetcher} */
    #fetcher;
    /** @type {Room} */
    room;
    /** @type {string} */
    id;
    /** @type {string} */
    name;
    /** @type {ServerSettingsController} */
    settings;

    /**
     * @param {Fetcher} fetcher
     * @param {Room} room
     */
    constructor(fetcher, room) {
        this.#fetcher = fetcher;
        this.room = room;
        void this.#load();
    }

    async #load() {
        /** @type {ServerRepresentation[]} */
        const result = await this.#fetcher.fetchCore("/server", 'GET');

        if (result === null) {
            return;
        }

        if (this.id) {
            this.select(this.id, this.name);
        } else {
            const server = result[0]
            this.select(server.id, server.name);
        }

        this.settings = new ServerSettingsController(this, this.#fetcher);
        this.settings.load()
    }

    select(id, name) {
        if (!id || !name) {
            console.error("Server id or name is null or undefined");
            return;
        }

        this.#updateServerName(id, name);
        void this.#usersLoad();
        void this.room.load(id);
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
                  void this.room.load(this.id);
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
            void this.#usersLoad();
        }
    }

    async #usersLoad() {
        /** @type {UserRepresentation[]} */
        const result = await this.#fetcher.fetchCore(`/server/${this.id}/user`, 'GET');

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
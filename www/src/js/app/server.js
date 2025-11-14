import ServerSettingsController from "./serverSettingsController.js";

export default class Server {
    #fetcher;
    #mediaURL;
    #coreUrl;
    #room;
    id;
    name;
    settings;

    constructor(fetcher, mediaURL, room, coreUrl) {
        this.#fetcher = fetcher;
        this.#mediaURL = mediaURL;
        this.#coreUrl = coreUrl;
        this.#room = room;
        this.#load();
    }

    async #load() {
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

        this.settings = new ServerSettingsController(this, this.#fetcher, this.#mediaURL);
    }

    select(id, name) {
        if (!id || !name) {
            console.error("Server id or name is null or undefined");
            return;
        }

        this.id = id;
        this.name = name;
        document.getElementById("server-name").innerText = name;

        this.#usersLoad();
        this.#room.load(id);
    }

    update(data) {
        switch (data.action) {
            case "MODIFY":
                this.#room.load(this.id);
                return;

            default:
                return;
        }
    }

    async #usersLoad() {
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

    async #createUser(data) {
        const id = data.id;
        const name = data.displayName;
        const status = data.status;
        const profilePicture = `${this.#mediaURL}/profiles/${id}`;

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
import MediaServer from "./media/media.server.js";

export class ServerSettingsMemberController {

    /**
     * @param {ServerSettingsController} serverSettings
     * @param {Fetcher} fetcher
     */
    constructor(serverSettings, fetcher) {
        this.serverSettings = serverSettings
        this.fetcher = fetcher
    }

    load() {
        this.fetcher.fetchCore(`/server/${this.serverSettings.server.id}/user`, 'GET')
            .then(result => {
                if (result) {
                    const sortedByDisplayName = [.../** @type {UserRepresentation[]} */(result)].sort((a, b) => {
                        return a.displayName.localeCompare(b.displayName);
                    });

                    if (sortedByDisplayName !== null) {
                        const userList = document.getElementById("server-setting-members");
                        userList.innerHTML = "";
                        for (const user of sortedByDisplayName) {
                            userList.appendChild(this.#memberItem(user));
                        }
                    }
                }
            });
    }

    /**
     * @param {UserRepresentation} data
     * @return {HTMLDivElement}
     */
    #memberItem(data) {
        const DIV = document.createElement('div');
        DIV.id = data.id;
        DIV.className = `${data.id} config-item`;

        const profilePicture = MediaServer.profiles(data.id);

        DIV.innerHTML = `
            <div class="relative">
                <img src="${profilePicture}" alt="PFP" class="icon ring-2" />
            </div>
            <div class="user">
                <div class="name" id="user-name">${data.displayName}<div>
            </div>
        `;

        return DIV;
    }
}
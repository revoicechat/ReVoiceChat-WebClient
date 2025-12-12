export class ServerSettingsEmoteController {

    /**
     * @param {ServerSettingsController} serverSettings
     * @param {Fetcher} fetcher
     */
    constructor(serverSettings, fetcher) {
        this.serverSettings = serverSettings
        this.fetcher = fetcher
    }

    /**
     * @param {string[]} flattenRisks
     * @param {boolean} isAdmin
     */
    handleRisks(isAdmin, flattenRisks) {
        const emoteRisks = new Set(['ADD_EMOTE', 'UPDATE_EMOTE', 'REMOVE_EMOTE']);
        if (isAdmin || flattenRisks.some(elem => emoteRisks.has(elem))) {
            void this.#emotesLoad();
        } else if (this.serverSettings.currentTab === "emotes") {
            this.serverSettings.select('overview');
        }
    }

    async #emotesLoad() {
        /** @type {EmoteRepresentation[]} */
        const response = await this.fetcher.fetchCore(`/emote/server/${this.serverSettings.server.id}`);

        const oldManager = document.getElementById("server-setting-emotes-form");
        if (oldManager) {
            oldManager.remove();
        }

        const emoji_manager = document.createElement('revoice-emoji-manager');
        emoji_manager.setAttribute('path', `server/${this.serverSettings.server.id}`);
        emoji_manager.id = "server-setting-emotes-form";
        emoji_manager.innerHTML = `<script type="application/json" slot="emojis-data">${JSON.stringify(response)}</script>`;
        document.getElementById("server-setting-content-emotes").appendChild(emoji_manager);
    }
}
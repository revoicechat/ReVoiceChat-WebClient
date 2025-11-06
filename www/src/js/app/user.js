import UserSettingsController from "./userSettingsController.js";

export default class User {
    #fetcher;
    #mediaURL;
    settings;
    id;
    displayName;

    constructor(fetcher, mediaURL) {
        this.#fetcher = fetcher;
        this.#mediaURL = mediaURL;
        this.#load();
        this.settings = new UserSettingsController(this, this.#fetcher, this.#mediaURL);
    }

    async #load() {
        const result = await this.#fetcher.fetchCore(`/user/me`, 'GET');

        if (result !== null) {
            this.id = result.id;
            this.displayName = result.displayName;

            document.getElementById("status-container").classList.add(result.id);
            document.getElementById("user-name").innerText = result.displayName;
            document.getElementById("user-status").innerText = result.status;
            document.getElementById("user-dot").className = `user-dot ${statusToDotClassName(result.status)}`;
            document.getElementById("user-picture").src = `${this.#mediaURL}/profiles/${result.id}`;    
        }
    }

    update(data) {
        const id = data.id;
        for (const icon of document.querySelectorAll(`.${id} img.icon`)) {
            icon.src = `${this.#mediaURL}/profiles/${id}?t=${Date.now()}`;
        }
        for (const name of document.querySelectorAll(`.${id} .name`)) {
            name.innerText = data.displayName;
        }
    }

    logout(){
        sessionStorage.removeItem('lastState');
        localStorage.removeItem('userSettings');
        eraseCookie('jwtToken');
        document.location.href = `index.html`;
    }
}
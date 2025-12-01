import UserSettingsController from "./userSettingsController.js";

export default class User {
    #fetcher;
    #mediaURL;
    /** @type {UserSettingsController} */
    settings;
    id;
    displayName;

    constructor(fetcher, mediaURL) {
        this.#fetcher = fetcher;
        this.#mediaURL = mediaURL;
        this.settings = new UserSettingsController(this, this.#fetcher, this.#mediaURL);
    }

    async load() {
        /** @type {UserRepresentation} */
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

    /** @param {UserRepresentation} data */
    update(data) {
        const id = data.id;
        const name = data.displayName;
        const picture = `${this.#mediaURL}/profiles/${id}?t=${Date.now()}`;

        // Static elements for self
        if(this.id === id){
            // Main page
            document.getElementById('user-name').innerText = name;
            document.getElementById('user-picture').src = picture;
            // User settings
            document.getElementById('overview-displayname').value = name;
            document.getElementById('setting-user-picture').src = picture;
        }
         
        // Dynamic elements
        for (const icon of document.getElementsByName(`user-picture-${id}`)) {
            icon.src = picture;
        }
        for (const name of document.getElementsByName(`user-name-${id}`)) {
            name.innerText = data.displayName;
        }
    }

    /** @param {UserStatusUpdate} data */
    setStatus(data){
        const id = data.userId;
        const status = data.status;

        const className = `user-dot ${statusToDotClassName(status)}`;

        // Static elements for self
        if(this.id === id){
            document.getElementById('user-dot').className = className;
        }

        // Dynamic elements
        for(const dot of document.getElementsByName(`user-dot-${id}`)){
            dot.className = className;
        }
    }

    logout(){
        this.#fetcher.fetchCore(`/auth/logout`, 'GET').then(() => {
            sessionStorage.removeItem('lastState');
            localStorage.removeItem('userSettings');
            eraseCookie('jwtToken');
            document.location.href = `index.html`;
        });
    }
}
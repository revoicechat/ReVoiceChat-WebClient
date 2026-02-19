import UserSettingsController from "./user.settings.controller.js";
import {eraseCookie, statusToColor} from "../lib/tools.js";
import MediaServer from "./media/media.server.js";
import CoreServer from "./core/core.server.js";

export default class UserController {
    /** @type {UserSettingsController} */
    settings;
    /** @type {string} */
    id;
    /** @type {string} */
    displayName;
    /** @type {string} */
    #type;

    #cachedElements = {
        statusContainer: null,
        userName: null,
        userStatus: null,
        userDot: null,
        userPicture: null,
        settingsUserName: null,
        settingsUserPicture: null
    }

    constructor() {
        this.settings = new UserSettingsController(this);
        this.#cachedElements.statusContainer = document.getElementById("status-container");
        this.#cachedElements.userName = document.getElementById("user-name");
        this.#cachedElements.userStatus = document.getElementById("user-status");
        this.#cachedElements.userDot = document.getElementById("user-dot");
        this.#cachedElements.userPicture = document.getElementById("user-picture");
        this.#cachedElements.settingsUserName = document.getElementById('settings-user-name');
        this.#cachedElements.settingsUserPicture = document.getElementById('setting-user-picture');
    }

    async load() {
        /** @type {UserRepresentation} */
        const result = await CoreServer.fetch(`/user/me`, 'GET');

        if (result !== null) {
            this.id = result.id;
            this.displayName = result.displayName;
            this.#type = result.type;
            
            this.#cachedElements.statusContainer.classList.add(result.id);
            this.#cachedElements.userName.innerText = result.displayName;
            this.#cachedElements.userStatus.innerText = result.status;
            this.#cachedElements.userDot.setAttribute('color', statusToColor(result.status));
            this.#cachedElements.userPicture.src = MediaServer.profiles(result.id);
            this.#cachedElements.userPicture.dataset.id = result.id;
        }

        await this.settings.load();
    }

    /** @param {UserRepresentation} data */
    update(data) {
        const id = data.id;
        const name = data.displayName;
        const picture = MediaServer.profiles(id);

        // Static elements for self
        if(this.id === id){
            // Main page
            this.#cachedElements.userName.innerText = name;
            this.#cachedElements.userPicture.src = picture;
            // User settings
            this.#cachedElements.settingsUserName.value = name;
            this.#cachedElements.settingsUserPicture.src = picture;
        }
         
        // Dynamic elements
        for (const icon of document.getElementsByName(`user-picture-${id}`)) {
            icon.src = picture;
        }
        for (const name of document.getElementsByName(`user-name-${id}`)) {
            name.innerText = data.displayName;
        }
    }

    isAdmin(){
        return (this.#type == "ADMIN");
    }

    /** @param {UserStatusUpdate} data */
    setStatus(data){
        const id = data.userId;
        const status = data.status;

        const color = statusToColor(status);

        // Static elements for self
        if(this.id === id){
            this.#cachedElements.userDot.setAttribute('color', color);
        }

        // Dynamic elements
        for(const dot of document.getElementsByName(`dot-${id}`)){
            dot.setAttribute('color', color);
        }
    }

    logout(){
        CoreServer.fetch(`/auth/logout`, 'GET').then(() => {
            sessionStorage.removeItem('lastState');
            localStorage.removeItem('userSettings');
            eraseCookie('jwtToken');
            document.location.href = `index.html`;
        });
    }
}
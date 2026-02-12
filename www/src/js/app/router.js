export default class Router {
    static APP = 'app'
    static USER_SETTINGS = 'user-settings'
    static SERVER_SETTINGS = 'server-settings'

    constructor(){
        document.getElementById('user-setting-open').addEventListener('click', () => this.routeTo(Router.USER_SETTINGS));
        document.getElementById('user-setting-close').addEventListener('click', () => this.routeTo(Router.APP));
        document.getElementById('server-setting-open').addEventListener('click', () => this.routeTo(Router.SERVER_SETTINGS));
        document.getElementById('server-setting-close').addEventListener('click', () => this.routeTo(Router.APP));
    }

    /** @param {string} destination */
    routeTo(destination) {
        for (const element of document.querySelectorAll('.main')) {
            element.classList.add('hidden');
        }

        switch (destination) {
            case Router.USER_SETTINGS:
                Router.#pushState(Router.USER_SETTINGS);
                document.getElementById('route-user-settings').classList.remove('hidden');
                break;

            case Router.SERVER_SETTINGS:
                Router.#pushState(Router.SERVER_SETTINGS);
                document.getElementById('route-server-settings').classList.remove('hidden');
                break;

            case Router.APP:
            default:
                Router.#pushState('');
                document.getElementById('route-app').classList.remove('hidden');
                break;
        }
    }

    /** @param {string} destination */
    static #pushState(destination) {
        const url = new URL(location);
        url.searchParams.delete('r');

        if (destination && destination !== "") {
            url.searchParams.set("r", destination);
        }

        history.pushState({}, "", url);
    }

    static getState() {
        return new URL(location).searchParams.get('r');
    }
}
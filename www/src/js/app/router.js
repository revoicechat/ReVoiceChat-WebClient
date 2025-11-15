export default class Router {
    constructor(){
        document.getElementById('user-setting-open').addEventListener('click', () => this.routeTo('user-settings'));
        document.getElementById('user-setting-close').addEventListener('click', () => this.routeTo('app'));
        document.getElementById('server-setting-open').addEventListener('click', () => this.routeTo('server-settings'));
        document.getElementById('server-setting-close').addEventListener('click', () => this.routeTo('app'));
    }

    routeTo(destination) {
        for (const element of document.querySelectorAll('.main')) {
            element.classList.add('hidden');
        }

        switch (destination) {
            case "user-settings":
                this.#pushState('user-settings');
                document.getElementById('route-user-settings').classList.remove('hidden');
                break;

            case "server-settings":
                this.#pushState('server-settings');
                document.getElementById('route-server-settings').classList.remove('hidden');
                break;

            case "app":
            default:
                this.#pushState('');
                document.getElementById('route-app').classList.remove('hidden');
                break;
        }
    }

    #pushState(destination) {
        const url = new URL(location);
        url.searchParams.delete('r');

        if (destination && destination !== "") {
            url.searchParams.set("r", destination);
        }

        history.pushState({}, "", url);
    }
}
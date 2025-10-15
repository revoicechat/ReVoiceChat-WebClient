export default class Router {
    routeTo(destination) {
        for (const element of document.querySelectorAll('.main')) {
            element.classList.add('hidden');
        }

        switch (destination) {
            case "setting":
                this.#pushState('setting');
                settingLoad();
                document.getElementById('route-setting').classList.remove('hidden');
                break;

            case "config":
                this.#pushState('config');
                configLoad()
                document.getElementById('route-config').classList.remove('hidden');
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
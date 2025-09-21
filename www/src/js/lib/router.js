document.addEventListener('DOMContentLoaded', function () {
    const route = getQueryVariable('r');
    if (route) {
        router(route);
    }
    else {
        router('app');
    }
})

function router(destination) {
    document.querySelectorAll('.main').forEach(element => {element.classList.add('hidden')});

    switch (destination) {
        case "setting":
            routerPushState('setting');
            settingLoad();
            document.getElementById('route-setting').classList.remove('hidden');
            break;

        case "config":
            routerPushState('config');
            configLoad()
            document.getElementById('route-config').classList.remove('hidden');
            break;

        case "app":
        default:
            routerPushState('');
            document.getElementById('route-app').classList.remove('hidden');
            break;
    }
}

function routerPushState(destination) {
    const url = new URL(location);
    url.searchParams.delete('r');

    if (destination && destination !== ""){
        url.searchParams.set("r", destination);
    }

    history.pushState({}, "", url);
}
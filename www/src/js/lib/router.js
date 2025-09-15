document.addEventListener('DOMContentLoaded', function () {
    const route = getQueryVariable('route');
    if (route) {
        router(route);
    }
    else {
        router('app');
    }
})

function router(destination) {
    document.querySelector('.main').classList.add('hidden');

    switch (destination) {
        case "setting":
            routerPushState('setting');
            document.getElementById('route-setting').classList.remove('hidden');
            settingLoad();
            break;

        case "config":
            routerPushState('config');
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
    url.searchParams.delete('route');

    if (destination && destination !== ""){
        url.searchParams.set("route", destination);
    }

    history.pushState({}, "", url);
}
const current = {
    coreUrl: null,
    mediaUrl: "https://media.revoicechat.fr",
    sse: null,
    server: {
        id: null,
        name: null,
    },
    room: {
        id: null,
        name: null,
        type: null,
    },
    user: {
        id: null,
        displayName: null,
    },
    chat: {
        mode: "send",
        editId: null,
    }
}

// Ready state
document.addEventListener('DOMContentLoaded', function () {
    document.body.classList.add("loaded");

    // Login
    if (sessionStorage.getItem('coreUrl')) {
        current.coreUrl = sessionStorage.getItem('coreUrl');
    }

    // Last state (app wasn't closed)
    if (sessionStorage.getItem('lastState')) {
        const lastState = JSON.parse(sessionStorage.getItem('lastState'));
        current.coreUrl = lastState.coreUrl;
        current.mediaUrl = lastState.mediaUrl;
        current.server = lastState.server;
        current.room = lastState.room;
        current.user = lastState.user;
    }

    // No data
    if (current.coreUrl === null) {
        document.location.href = `index.html`;
    }

    // Current page is the app
    const currentLocation = window.location.pathname.substring(window.location.pathname.lastIndexOf("/"));
    if (currentLocation === "/app.html") {
        getServers();
        sseOpen();
        getUsername();
    }
});

addEventListener("beforeunload", () => {
    if (current.sse !== null) {
        current.sse.close();
        current.sse = null;
    }
    sessionStorage.setItem('lastState', JSON.stringify(current));
})
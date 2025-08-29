const current = {
    sse: null,
    jwtToken: null,
    webrtc: {
        socket: null,
        p2p: null,
        activeRoom: null,
    },
    url: {
        core: null,
        media: null,
        voiceSignal: null,
        voiceStun: null,
    },
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
        emojisGlobal: []
    }
}

// Ready state
document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.setAttribute("data-theme", localStorage.getItem("Theme") || "default");
    document.body.classList.add("loaded");

    // Login
    if (sessionStorage.getItem('url.core')) {
        current.url.core = sessionStorage.getItem(('url.core'));

        const core = new URL(current.url.core);
        
        current.url.media = `https://${core.host}/media`;
        current.url.voiceSignal = `https://${core.host}/api/signal`;
        current.url.voiceStun = `stun:stundev.revoicechat.fr:3480`;

        current.jwtToken = getCookie("jwtToken");
    }

    // Last state (app wasn't closed)
    if (sessionStorage.getItem('lastState')) {
        const lastState = JSON.parse(sessionStorage.getItem('lastState'));
        current.url = lastState.url;
        current.server = lastState.server;
        current.room = lastState.room;
        current.user = lastState.user;
    }

    // No data
    if (current.url.core === null) {
        document.location.href = `index.html`;
    }

    // Current page is the app
    const currentLocation = window.location.pathname.substring(window.location.pathname.lastIndexOf("/"));
    if (currentLocation === "/app.html") {
        getServers();
        sseOpen();
        getUsername();
        getEmojisGlobal();
    }
});

addEventListener("beforeunload", () => {
    sessionStorage.setItem('lastState', JSON.stringify(current));
    sseClose();
})
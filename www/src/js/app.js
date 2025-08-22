const current = {
    sse: null,
    webrtc: {
        socket: null,
        p2p: null,
    },
    url: {
        core: null,
        media: "https://media.revoicechat.fr", // DEV ONLY
        voiceSignal: "https://srv.revoicechat.fr/signal", // DEV ONLY
        voiceStun: "stun.revoicechat.fr", // Test with : stun.l.google.com:19302
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
    }
}

// Ready state
document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.setAttribute("data-theme", localStorage.getItem("Theme") || "default");
    document.body.classList.add("loaded");

    // Login
    if (sessionStorage.getItem('url.core')) {
        current.url.core = sessionStorage.getItem('url.core');
    }

    // Last state (app wasn't closed)
    if (sessionStorage.getItem('lastState')) {
        const lastState = JSON.parse(sessionStorage.getItem('lastState'));
        current.url.core = lastState.url.core;
        current.url.media = lastState.url.media;
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
        initWebRTC();
    }
});

addEventListener("beforeunload", () => {
    if (current.sse !== null) {
        current.sse.close();
        current.sse = null;
    }
    sessionStorage.setItem('lastState', JSON.stringify(current));
})
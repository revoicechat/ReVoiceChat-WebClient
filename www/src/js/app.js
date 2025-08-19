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
    // Login
    if (sessionStorage.getItem('coreUrl')) {
        current.coreUrl = sessionStorage.getItem('coreUrl');
        getServers();
        sseOpen();
        getUsername();
    }

    // Last state (app wasn't closed)
    if(sessionStorage.getItem('lastState')){
        const lastState = JSON.parse(sessionStorage.getItem('lastState'));
        current.coreUrl = lastState.coreUrl;
        current.mediaUrl = lastState.mediaUrl;
        current.server = lastState.server;
        current.room = lastState.room;
        current.user = lastState.user;
    }

    if(current.coreUrl === null){
        document.location.href = `index.html`;
    }
});

addEventListener("beforeunload", () => {
    current.sse.close();
    sessionStorage.setItem('lastState', JSON.stringify(current));
})
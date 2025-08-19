const current = {
    coreUrl: null,
    mediaUrl: "https://media.revoicechat.fr",
    sse: null,
    server: {
        id: null,
    },
    room: {
        id: null,
    },
    user: {
        id: null,
    },
    chat: {
        mode: "send",
        editId: null,
    }
}

// Ready state
document.addEventListener('DOMContentLoaded', function () {
    if (sessionStorage.getItem('host')) {
        current.coreUrl = sessionStorage.getItem('host');
        getServers();
        sseOpen();
        getUsername();
    }
    else {
        document.location.href = `index.html`;
    }
});

addEventListener("beforeunload", () => {
    current.sse.close();
})
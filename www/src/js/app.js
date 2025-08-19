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
    user:{
        id: null,
    }
}

// Ready state
document.addEventListener('DOMContentLoaded', function () {
    if (sessionStorage.getItem('host')) {
        current.coreUrl = sessionStorage.getItem('host');
        getServers();
        sseConnect();
        getUsername();
    }
    else {
        document.location.href = `index.html`;
    }
});
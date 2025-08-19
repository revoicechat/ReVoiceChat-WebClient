const current = {
    host: null,
    mediaHost: "https://media.revoicechat.fr",
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
        current.host = sessionStorage.getItem('host');
        getServers();
        sseConnect();
        getUsername();
    }
    else {
        document.location.href = `index.html`;
    }
});
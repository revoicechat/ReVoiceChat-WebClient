const currentState = {
    hostUrl: null,
    global: {
        sse: null,
    },
    server: {
        id: null,
    },
    room: {
        id: null,
    }
}

// Ready state
document.addEventListener('DOMContentLoaded', function () {
    currentState.hostUrl = getQueryVariable("host");

    if(currentState.hostUrl === false){
        document.location.href = `index.html`;
    }

    let loadingSwal = Swal.fire({
        icon: "info",
        title: `Loading server list from host\n ${currentState.hostUrl}`,
        focusConfirm: false,
        allowOutsideClick: false,
        timerProgressBar: true,
        animation: false,
        didOpen: () => {
            Swal.showLoading();
            getServers(loadingSwal);
            sseConnect();
        }
    })
});

async function getServers(loadingSwal) {
    try {
        const response = await fetch(`${currentState.hostUrl}/server`, {
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        const result = await response.json();

        loadingSwal.close();
        buildServerList(result);
        selectServer(result[0]);
    }
    catch (error) {
        loadingSwal.close();
        console.error("Error while retrieving server list : ", error);
    }
}

function buildServerList(data) {
    /*const serverList = document.getElementById("srv-list");
    for (const neddle in data) {
        serverList.appendChild(createAnchor(data[neddle].name, () => selectServer(data[neddle].id), data[neddle].id));
    }*/
}

function selectServer(serverData) {
    if (serverData === undefined || serverData === null) {
        console.error("serverData is null or undefined");
        return;
    }

    console.log(`Selected server : ${serverData.id}`);
    currentState.server.id = serverData.id;
    document.getElementById("server-name").innerText = serverData.name;
    getRooms(serverData.id);
}

function sseConnect() {
    console.log(`Connecting to "${currentState.hostUrl}/sse"`);

    if (currentState.global.sse !== null) {
        currentState.global.sse.close();
        currentState.global.sse = null;
    }

    currentState.global.sse = new EventSource(`${currentState.hostUrl}/sse`, { withCredentials: true });

    currentState.global.sse.onmessage = (event) => {
        eventData = JSON.parse(event.data);
        if (eventData.roomId === currentState.room.id) {
            const ROOM = document.getElementById("room-messages");
            ROOM.appendChild(createMessage(eventData));
            ROOM.scrollTop = ROOM.scrollHeight;
        }
    };

    currentState.global.sse.onerror = () => {
        console.error(`An error occurred while attempting to connect to "${currentState.hostUrl}/sse".\nRetry in 10 seconds`);
        setTimeout(() => {
            sseConnect();
            getMessages(currentState.room.id);
        }, 10000);
    }
}

async function getServers() {
    const result = await getRequestToHost("/server");

    if(result === null){
        document.location.href = "index.html";
        return;
    }

    buildServerList(result);
    selectServer(result[0]);
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
    current.server.id = serverData.id;
    document.getElementById("server-name").innerText = serverData.name;
    getRooms(serverData.id);
}

function sseConnect() {
    console.log(`Connecting to "${current.host}/sse"`);

    if (current.sse !== null) {
        current.sse.close();
        current.sse = null;
    }

    current.sse = new EventSource(`${current.host}/sse`, { withCredentials: true });

    current.sse.onmessage = (event) => {
        console.log(event.data);

        if(event.data === "ping"){
            console.log("Got pinged by server");
            return;
        }

        eventData = JSON.parse(event.data);
        if (eventData.roomId === current.room.id) {
            const ROOM = document.getElementById("room-messages");
            ROOM.appendChild(createMessage(eventData));
            ROOM.scrollTop = ROOM.scrollHeight;
        }
    };

    current.sse.onerror = () => {
        console.error(`An error occurred while attempting to connect to "${current.host}/sse".\nRetry in 10 seconds`);
        setTimeout(() => {
            sseConnect();
            getMessages(current.room.id);
        }, 10000);
    }
}

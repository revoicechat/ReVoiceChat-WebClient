async function getServers() {
    const result = await getRequestOnCore("/server");

    if (result === null) {
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

function sseOpen() {
    console.log(`Connecting to "${current.coreUrl}/sse"`);

    if (current.sse !== null) {
        current.sse.close();
        current.sse = null;
    }

    current.sse = new EventSource(`${current.coreUrl}/sse`, { withCredentials: true });

    current.sse.onmessage = (event) => {
        event = JSON.parse(event.data);

        console.log("New SSE event : ", event);

        switch (event.type) {
            case "PING":
                console.log("Got pinged by server.");
                return;

            case "ROOM_MESSAGE":
                if (event.data.roomId === current.room.id) {
                    const ROOM = document.getElementById("room-messages");

                    switch (event.data.actionType) {
                        case "ADD":
                            ROOM.appendChild(createMessage(event.data));
                            break;
                        case "MODIFY":
                            document.getElementById(event.data.id).innerText = event.data.text;
                            break;
                        case "REMOVE":
                            document.getElementById(`container-${event.data.id}`).remove();
                            break;
                        default:
                            console.error("Unsupported actionType : ", event.data.actionType);
                            break;
                    }

                    ROOM.scrollTop = ROOM.scrollHeight;
                }

                return;

            case "DIRECT_MESSAGE":
                return;

            case "USER_STATUS_CHANGE":
                return;

            default:
                console.error("SSE type not allowed.");
                return;
        }
    };

    current.sse.onerror = () => {
        console.error(`An error occurred while attempting to connect to "${current.coreUrl}/sse".\nRetry in 10 seconds`);
        setTimeout(() => {
            sseConnect();
            getMessages(current.room.id);
        }, 10000);
    }
}

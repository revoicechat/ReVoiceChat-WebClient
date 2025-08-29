async function getServers() {
    const result = await getCoreAPI("/server");

    if (result === null) {
        //document.location.href = "index.html";
        return;
    }

    buildServerList(result);

    if (current.server.id !== null) {
        selectServer(current.server);
    }
    else {
        selectServer(result[0]);
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

    console.info(`SERVER : Selected server : ${serverData.id}`);

    current.server = serverData;
    document.getElementById("server-name").innerText = serverData.name;

    getServerUsers(serverData.id);
    getRooms(serverData.id);
}

function sseOpen() {
    console.info(`SERVER : Connecting to "${current.url.core}/api/sse"`);

    // Close current if it exist before openning a new connection
    sseClose();

    current.sse = new EventSource(`${current.url.core}/api/sse?jwt=${current.jwtToken}`);

    current.sse.onmessage = (event) => {
        event = JSON.parse(event.data);

        console.debug("SSE : ", event);

        switch (event.type) {
            case "PING":
                console.info("SSE : Pinged by server.");
                return;

            case "ROOM_MESSAGE":
                if (event.data.roomId === current.room.id) {
                    const ROOM = document.getElementById("room-messages");

                    switch (event.data.actionType) {
                        case "ADD":
                            ROOM.appendChild(createMessage(event.data));
                            break;
                        case "MODIFY":
                            document.getElementById(event.data.id).replaceWith(createMessageContent(event.data));
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
        console.error(`An error occurred while attempting to connect to "${current.url.core}/api/sse".\nRetry in 10 seconds`);
        setTimeout(() => {
            sseOpen();
            getMessages(current.room.id);
        }, 10000);
    }
}

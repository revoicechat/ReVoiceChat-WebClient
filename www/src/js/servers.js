async function getServers() {
    const result = await getCoreAPI("/server");

    if (result === null) {
        //document.location.href = "index.html";
        return;
    }

    buildServerList(result);

    if (global.server.id !== null) {
        selectServer(global.server);
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

    global.server = serverData;
    document.getElementById("server-name").innerText = serverData.name;

    getServerUsers(serverData.id);
    getRooms(serverData.id);
}

function sseOpen() {
    console.info(`SERVER : Connecting to "${global.url.core}/api/sse"`);

    // Close current if it exist before openning a new connection
    sseClose();

    global.sse = new EventSource(`${global.url.core}/api/sse?jwt=${global.jwtToken}`);

    global.sse.onmessage = (event) => {
        event = JSON.parse(event.data);
        const type = event.type;
        const data = event.data;

        console.debug("SSE : ", event);

        switch (event.type) {
            case "PING":
                console.info("SSE : Pinged by server.");
                return;

            case "ROOM_MESSAGE":
                if (data.roomId === global.room.id) {
                    const ROOM = document.getElementById("text-content");

                    switch (event.data.actionType) {
                        case "ADD":
                            ROOM.appendChild(createMessage(data));
                            break;
                        case "MODIFY":
                            document.getElementById(data.id).replaceWith(createMessageContent(data));
                            break;
                        case "REMOVE":
                            document.getElementById(`container-${data.id}`).remove();
                            break;
                        default:
                            console.error("Unsupported actionType : ", data.actionType);
                            break;
                    }

                    ROOM.scrollTop = ROOM.scrollHeight;
                }

                return;

            case "DIRECT_MESSAGE":
                return;

            case "USER_STATUS_CHANGE":
                return;

            case "VOICE_JOINING":
                if (data.roomId === global.room.id) {
                    voiceUserJoining(data.user);
                }
                return;

            case "VOICE_LEAVING":
                if (data.roomId === global.room.id) {
                    voiceUserLeaving(data.userId);
                }
                return;

            default:
                console.error("SSE type unknowned: ", type);
                return;
        }
    };

    global.sse.onerror = () => {
        console.error(`An error occurred while attempting to connect to "${global.url.core}/api/sse".\nRetry in 10 seconds`);
        setTimeout(() => {
            sseOpen();
            getMessages(global.room.id);
        }, 10000);
    }
}

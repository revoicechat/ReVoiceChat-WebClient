async function getRooms(serverId) {
    try {
        const response = await fetch(`${currentState.hostUrl}/server/${serverId}/room`, {
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        createRoomList(result);
        selectRoom(result[0]);
    }
    catch (error) {
        connectingSwal.close();
        console.error("Error getting room : ", error);
    }
}

function createRoomList(data) {
    const roomList = document.getElementById("room-list");
    roomList.innerHTML = "";
    for (const neddle in data) {
        roomList.appendChild(createRoom(data[neddle], () => selectRoom(data[neddle])));
    }
}

function createRoom(roomData, onclick) {
    const DIV = document.createElement('div');
    DIV.id = roomData.id;
    DIV.className = "room theme";
    DIV.onclick = onclick;
    DIV.innerHTML = `<h3 class="room-title">${roomData.name}</h3>`;
    return DIV;
}

function selectRoom(roomData) {
    if (roomData === undefined || roomData === null) {
        console.error("roomData is null or undefined");
        return;
    }

    if (roomData.type === "TEXT") {
        console.log(`Selected room : ${roomData.id}`);
        if (currentState.room.id !== null) {
            document.getElementById(currentState.room.id).classList.remove("active");
        }
        currentState.room = roomData;

        document.getElementById(roomData.id).classList.add("active");
        document.getElementById("room-header-name").innerText = roomData.name;

        getMessages(roomData.id);
    }
}
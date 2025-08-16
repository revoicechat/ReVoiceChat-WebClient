async function getRooms(serverId) {
    try {
        const response = await fetch(`${hostUrl}/server/${serverId}/room`, {
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
    DIV.className = "chat-hover p-4 border-b border-gray-700 cursor-pointer relative";

    const ANCHOR = document.createElement('a');
    ANCHOR.onclick = onclick;
    ANCHOR.innerHTML = `
        <div class="flex items-center space-x-3">
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                    <h3 class="font-semibold text-white truncate">${roomData.name}</h3>
                </div>
            </div>
        </div>`;

    DIV.appendChild(ANCHOR);
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
            document.getElementById(currentState.room.id).classList.remove("bg-green-900", "bg-opacity-20", "border-l-4", "border-green-400");
        }
        currentState.room = roomData;

        document.getElementById(roomData.id).classList.add("bg-green-900", "bg-opacity-20", "border-l-4", "border-green-400");
        document.getElementById("room-header-name").innerText = roomData.name;

        getMessages(roomData.id);
    }
}
async function getRooms(serverId) {
    const result = await getCoreAPI(`/server/${serverId}/room`);

    if (result !== null) {
        createRoomList(result);

        if (current.room.id !== null) {
            selectRoom(current.room);
        }
        else {
            selectRoom(result[0]);
        }
    }
}

function createRoomList(data) {
    const roomList = document.getElementById("room-container");
    roomList.innerHTML = "";
    for (const neddle in data) {
        roomList.appendChild(createRoom(data[neddle], () => selectRoom(data[neddle])));
    }
}

function createRoom(roomData, onclick) {
    const DIV = document.createElement('div');
    let icon = "";

    switch (roomData.type) {
        case "TEXT":
            icon = SVG_CHAT_BUBBLE;
            break;
        case "WEBRTC":
            icon = SVG_PHONE;
            break;
    }

    DIV.id = roomData.id;
    DIV.className = "room";
    DIV.onclick = onclick;
    DIV.innerHTML = `
        <h3 class="room-title">
        ${icon}
        ${roomData.name}
        </h3>`;
    return DIV;
}

function selectRoom(roomData) {
    if (roomData === undefined || roomData === null) {
        console.error("roomData is null or undefined");
        return;
    }

    if (roomData.type === "TEXT") {
        console.info(`ROOM : Selected text room : ${roomData.id}`);

        if (current.room.id !== null && document.getElementById(current.room.id) !== undefined) {
            document.getElementById(current.room.id).classList.remove("active");
        }

        current.room = roomData;

        document.getElementById(roomData.id).classList.add("active");
        document.getElementById("room-name").innerText = roomData.name;
        document.getElementById("chat-input").placeholder = `Send a message in ${roomData.name}`;
        document.getElementById("chat-input").focus();

        getMessages(roomData.id);
    }

    if (roomData.type === "WEBRTC") {
        console.info(`ROOM : Selected webrtc room : ${roomData.id}`);
        //startWebRtcCall(roomData.id);
        startVoiceCall(roomData.id);
    }
}
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
    const roomList = document.getElementById("room-list-container");
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
    DIV.className = "room-list";
    DIV.onclick = onclick;
    DIV.innerHTML = `
        <h3 class="room-title">
        ${icon}
        ${roomData.name}
        </h3>`;
    return DIV;
}

function selectTextRoom(roomData) {
    console.info(`ROOM : Selected text room : ${roomData.id}`);

    if (current.room.id !== null && document.getElementById(current.room.id) !== undefined) {
        document.getElementById(current.room.id).classList.remove("active");
    }

    current.room = roomData;

    document.getElementById(roomData.id).classList.add("active");
    document.getElementById("room-icon").innerHTML = SVG_CHAT_BUBBLE;
    document.getElementById("room-name").innerText = roomData.name;

    document.getElementById("voice-container").classList.add('hidden');
    document.getElementById("text-container").classList.remove('hidden');

    document.getElementById("chat-input").placeholder = `Send a message in ${roomData.name}`;
    document.getElementById("chat-input").focus();

    getMessages(roomData.id);
}

function selectWebRtcRoom(roomData) {
    console.info(`ROOM : Selected WebRTC room : ${roomData.id}`);
    startWebRtcCall(roomData.id);
}

function selectVoiceRoom(roomData) {
    console.info(`ROOM : Selected voice room : ${roomData.id}`);

    if (current.room.id !== null && document.getElementById(current.room.id) !== undefined) {
        document.getElementById(current.room.id).classList.remove("active");
    }

    current.room = roomData;

    document.getElementById(roomData.id).classList.add("active");
    document.getElementById("room-icon").innerHTML = SVG_PHONE;
    document.getElementById("room-name").innerText = roomData.name;

    document.getElementById("text-container").classList.add('hidden');
    document.getElementById("voice-container").classList.remove('hidden');

    updateVoiceControl();

    document.getElementById("voice-content").innerHTML = "";
}

function selectRoom(roomData) {
    if (roomData === undefined || roomData === null) {
        console.error("roomData is null or undefined");
        return;
    }

    switch (roomData.type) {
        case "TEXT":
            selectTextRoom(roomData);
            break;
        case "WEBRTC":
            //selectWebRtcRoom(roomData);
            selectVoiceRoom(roomData);
            break;
        case "VOICE":
            selectVoiceRoom(roomData);
            break;
    }
}
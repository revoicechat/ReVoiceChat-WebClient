async function getRooms(serverId) {
    const roomResult = await fetchCoreAPI(`/server/${serverId}/room`, 'GET');
    const structResult = await fetchCoreAPI(`/server/${serverId}/structure`, 'GET');

    if (structResult && structResult.items && roomResult) {
        const rooms = [];
        for (const room of roomResult) {
            rooms[room.id] = room;
        }

        const roomList = document.getElementById("room-list-container");
        roomList.innerHTML = "";
        roomCreate(roomList, rooms, structResult.items);

        if (global.room.id !== null) {
            roomSelect(global.room);
        }
    }
}

function roomCreate(roomList, roomData, data) {
    for (const item of data) {
        if (item.type === 'CATEGORY') {
            roomList.appendChild(roomCreateSeparator(item));
            roomCreate(roomList, roomData, item.items)
        }

        if (item.type === 'ROOM') {
            const elementData = roomData[item.id];
            const roomElement = roomCreateElement(elementData, () => roomSelect(elementData));
            if (roomElement) {
                roomList.appendChild(roomElement);
            }
        }
    }
}

function roomCreateElement(data, onclick) {
    const DIV = document.createElement('div');
    let icon = "";

    if (data === undefined || data === null) {
        return;
    }

    switch (data.type) {
        case "TEXT":
            icon = `<revoice-icon-chat-bubble></revoice-icon-chat-bubble>`;
            break;
        case "VOICE":
        case "WEBRTC":
            icon = `<revoice-icon-phone></revoice-icon-phone>`;
            break;
    }

    DIV.id = data.id;
    DIV.className = "room-element";
    DIV.onclick = onclick;
    DIV.innerHTML = `
        <h3 class="room-title">
        ${icon}
        ${data.name}
        </h3>`;
    return DIV;
}

function roomSelectText(data) {
    console.info(`ROOM : Selected text room : ${data.id}`);

    if (global.room.id !== null && document.getElementById(global.room.id) !== undefined) {
        document.getElementById(global.room.id).classList.remove("active");
    }

    global.room = data;

    document.getElementById(data.id).classList.add("active");
    document.getElementById("room-icon").innerHTML = `<revoice-icon-chat-bubble></revoice-icon-chat-bubble>`;
    document.getElementById("room-name").innerText = data.name;

    document.getElementById("voice-container").classList.add('hidden');
    document.getElementById("text-container").classList.remove('hidden');

    document.getElementById("text-input").placeholder = `Send a message in ${data.name}`;
    document.getElementById("text-input").focus();

    getMessages(data.id);
}

function roomSelectWebRtc(data) {
    console.info(`ROOM : Selected WebRTC room : ${data.id}`);
    startWebRtcCall(data.id);
}

function roomSelectVoice(data) {
    console.info(`ROOM : Selected voice room : ${data.id}`);

    if (global.room.id !== null && document.getElementById(global.room.id) !== undefined) {
        document.getElementById(global.room.id).classList.remove("active");
    }

    global.room = data;

    document.getElementById(data.id).classList.add("active");
    document.getElementById("room-icon").innerHTML = `<revoice-icon-phone></revoice-icon-phone>`;
    document.getElementById("room-name").innerText = data.name;

    document.getElementById("text-container").classList.add('hidden');
    document.getElementById("voice-container").classList.remove('hidden');

    voiceUpdateSelf();
    voiceShowJoinedUsers(data.id);
}

function roomSelect(data) {
    if (data === undefined || data === null) {
        console.error("ROOM : Can't select a room because data is null or undefined");
        return;
    }

    switch (data.type) {
        case "TEXT":
            roomSelectText(data);
            break;
        case "WEBRTC":
            roomSelectWebRtc(data);
            break;
        case "VOICE":
            roomSelectVoice(data);
            break;
    }
}

function roomCreateSeparator(data) {
    const DIV = document.createElement('div');
    DIV.className = "room-separator";
    DIV.innerHTML = `<h3 class="room-title">${data.name.toUpperCase()}</h3>`;
    return DIV;
}
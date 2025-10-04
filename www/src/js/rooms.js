async function getRooms(serverId) {
    const roomResult = await fetchCoreAPI(`/server/${serverId}/room`, 'GET');
    const structResult = await fetchCoreAPI(`/server/${serverId}/structure`, 'GET');

    if (structResult?.items && roomResult) {
        const rooms = [];
        for (const room of roomResult) {
            rooms[room.id] = room;
        }

        const roomList = document.getElementById("sidebar-room-container");
        roomList.innerHTML = "";
        await roomCreate(roomList, rooms, structResult.items);

        if (global.room.id !== null) {
            roomSelect(global.room);
        }
    }
}

async function roomCreate(roomList, roomData, data) {
    for (const item of data) {
        if (item.type === 'CATEGORY') {
            roomList.appendChild(roomCreateSeparator(item));
            await roomCreate(roomList, roomData, item.items)
        }

        if (item.type === 'ROOM') {
            const elementData = roomData[item.id];

            if(global.room.id === null){
                global.room = elementData;
            }
    
            const roomElement = await roomCreateElement(elementData, );
            if (roomElement) {
                roomList.appendChild(roomElement);
            }
        }
    }
}

function roomIcon(type){
    switch (type) {
        case "TEXT":
            return `<revoice-icon-chat-bubble></revoice-icon-chat-bubble>`;
        case "VOICE":
        case "WEBRTC":
            return `<revoice-icon-phone></revoice-icon-phone>`;
    }
}

async function roomCreateElement(data) {
    const DIV = document.createElement('div');

    if (data === undefined || data === null) {
        return;
    }

    const icon = roomIcon(data.type);

    DIV.id = data.id;
    DIV.className = "sidebar-room-element";
    DIV.onclick = () => roomSelect(data);

    let extension = "";
    if(data.type === "VOICE"){
        DIV.ondblclick = () => {voiceJoin(data.id);}
        let userCount = await voiceUsersCount(data.id);
        extension = `${userCount}<revoice-icon-user></revoice-icon-user>`;
    }

    DIV.innerHTML = `
        <h3 class="room-title">
        ${icon}
        <div class="room-title-name">${data.name}</div>
        <div class="room-title-extension" id="room-extension-${data.id}">${extension}</div>
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
    DIV.className = "sidebar-room-separator";
    DIV.innerHTML = `<h3 class="room-title">${data.name.toUpperCase()}</h3>`;
    return DIV;
}

function roomUpdate(data){
    const room = data.room;

    if(!room && room.serverId !== global.server.id){return;}

    switch(data.action){
        case "ADD":
        case "REMOVE":
            getRooms(global.server.id);
            return;

        case "MODIFY":
            document.getElementById(room.id).children[0].innerHTML = `${roomIcon(room.type)} ${room.name}`;
            if(room.id === global.room.id){
                document.getElementById('room-name').innerText = room.name;
            }
            return;
    }
}

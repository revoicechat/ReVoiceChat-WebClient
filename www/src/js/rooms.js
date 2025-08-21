async function getRooms(serverId) {
    const result = await getRequestOnCore(`/server/${serverId}/room`);

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
            icon = `<svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24"><path clip-rule="evenodd" d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .44 1.223ZM8.25 10.875a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25ZM10.875 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875-1.125a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z" fill-rule="evenodd"></path></svg>`;
            break;
        case "WEBRTC":
            icon = `<svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24"><path clip-rule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" fill-rule="evenodd"></path></svg>`;
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
        console.log(`Selected room : ${roomData.id}`);

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
}
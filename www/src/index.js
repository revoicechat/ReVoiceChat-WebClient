let hostUrl = "https://srv.revoicechat.fr";

const currentState = {
    serverId: null,
    roomId: null,
}

// Ready state
document.addEventListener('DOMContentLoaded', async function () {
    const { value: inputUrl } = await Swal.fire({
        icon: "question",
        input: "text",
        inputLabel: "Choose your host",
        inputPlaceholder: "Enter the URL",
        inputValue: hostUrl,
        allowOutsideClick: false,
        allowEscapeKey: false
    });
    if (inputUrl) {
        hostUrl = inputUrl;

        let loadingSwal = Swal.fire({
            icon: "info",
            title: `Connecting to \n ${inputUrl}`,
            focusConfirm: false,
            allowOutsideClick: false,
            timerProgressBar: true,
            didOpen: () => {
                Swal.showLoading();
                getServers(loadingSwal);
            }
        })
    }
});

async function getServers(loadingSwal) {
    fetch(`${hostUrl}/server`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
        headers: {
            'Content-Type': 'application/json'
        }
    }).then((response) => {
        return response.json();
    }).then((body) => {
        console.log("Server list : ", body);
        loadingSwal.close();

        buildServerList(body);
        selectServer(body[0].id);

    }).catch((error) => {
        console.log(error)
    });
}

function buildServerList(data) {
    const serverList = document.getElementById("srv-list");
    for (const neddle in data) {
        serverList.appendChild(createAnchor(data[neddle].name, () => selectServer(data[neddle].id), data[neddle].id));
    }
}

function selectServer(serverId) {
    console.log(`Select server : ${serverId}`);
    if (currentState.serverId !== null) {
        document.getElementById(currentState.serverId).classList.remove("rvc-active");
    }
    currentState.serverId = serverId;
    document.getElementById(serverId).classList.add("rvc-active");
    getRooms(serverId);
}

async function getRooms(serverId) {
    fetch(`${hostUrl}/server/${serverId}/room`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
        headers: {
            'Content-Type': 'application/json'
        }
    }).then((response) => {
        return response.json();
    }).then((body) => {
        console.log("Room list : ", body);

        buildRoomList(body);
        selectRoom(body[0].id);

    }).catch((error) => {
        console.log(error)
    });
}

function buildRoomList(data) {
    const roomList = document.getElementById("room-list");
    roomList.innerHTML = "";
    for (const neddle in data) {
        roomList.appendChild(createAnchor(data[neddle].name, () => selectRoom(data[neddle].id), data[neddle].id));
    }
}

function selectRoom(roomId) {
    console.log(`Select room : ${roomId}`);
    if (currentState.roomId !== null) {
        document.getElementById(currentState.roomId).classList.remove("rvc-active");
    }
    currentState.roomId = roomId;
    document.getElementById(roomId).classList.add("rvc-active");
}

async function getRoomText(roomId) {
    fetch(`${hostUrl}/room/${roomId}`, fetchInit).then((response) => {
        return response.json();
    }).then((body) => {
        console.log("Text from room : ", body);
    }).catch((error) => {
        console.log(error)
    });
}
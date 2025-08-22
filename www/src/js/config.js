const currentConfig = {
    active: null,
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('config-server-uuid').innerText = current.server.id;
    document.getElementById('config-server-name').value = current.server.name;
    selectConfigItem("overview");
});

document.getRootNode().addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.location.href = "app.html";
    }
});

function selectConfigItem(name) {
    if (currentConfig.active !== null) {
        document.getElementById(currentConfig.active).classList.remove("active");
        document.getElementById(`${currentConfig.active}-config`).classList.add("hidden");
    }

    currentConfig.active = name;
    document.getElementById(name).classList.add('active');
    document.getElementById(`${name}-config`).classList.remove('hidden');

    switch (name) {
        case 'rooms':
            loadRooms();
            break;

        case 'members':
            loadMembers();
            break;
    }
}

function createContextMenuButton(className, innerHTML, onclick){
    const DIV = document.createElement('div');
    DIV.className = className;
    DIV.innerHTML = innerHTML;
    DIV.onclick = onclick;
    return DIV;
}

async function loadRooms() {
    const result = await getRequestOnCore(`/server/${current.server.id}/room`);

    if (result !== null) {
        const roomList = document.getElementById("config-rooms-list");
        roomList.innerHTML = "";

        for (const neddle in result) {
            roomList.appendChild(await createItemRoom(result[neddle]));
        }
    }
}

async function createItemRoom(data) {
    const DIV = document.createElement('div');
    DIV.id = data.id;
    DIV.className = "config-item";

    // Name
    const DIV_NAME = document.createElement('div');
    DIV_NAME.className = "name";
    DIV_NAME.innerText = data.name;
    DIV.appendChild(DIV_NAME);

    // Context menu
    const DIV_CM = document.createElement('div');
    DIV_CM.className = "context-menu";
    DIV_CM.appendChild(createContextMenuButton("icon", SVG_PENCIL, () => configEditRoom(data)));
    DIV_CM.appendChild(createContextMenuButton("icon", SVG_TRASH, () => configDeleteRoom(data)));
    DIV.appendChild(DIV_CM);

    return DIV;
}

async function loadMembers() {
    const result = await getRequestOnCore(`/server/${current.server.id}/user`);

    if (result) {
        const sortedByDisplayName = [...result].sort((a, b) => {
            return a.displayName.localeCompare(b.displayName);
        });

        if (sortedByDisplayName !== null) {
            const userList = document.getElementById("config-members-list");
            userList.innerHTML = "";

            for (const neddle in sortedByDisplayName) {
                userList.appendChild(await createItemUser(sortedByDisplayName[neddle]));
            }
        }
    }
}

async function createItemUser(data) {
    const DIV = document.createElement('div');
    DIV.id = data.id;
    DIV.className = "config-item";

    let profilePicture = "src/img/default-avatar.webp";
    if (await fileExistOnMedia(`/profiles/${data.id}`)) {
        profilePicture = `${current.mediaUrl}/profiles/${data.id}`;
    }

    DIV.innerHTML = `
        <div class="relative">
            <img src="${profilePicture}" alt="PFP" class="icon ring-2" />
        </div>
        <div class="user">
            <div class="name" id="user-name">${data.displayName}<div>
        </div>
    `;

    return DIV;
}

function updateServerName(input) {
}

const FORM_DATA = {
    name: null,
    type: null
};

async function configAddRoom() {
    FORM_DATA.name = 'New room';
    FORM_DATA.type = 'TEXT';

    Swal.fire({
        title: 'Add a room',
        animation: false,
        customClass: {
            title: "swalTitle",
            popup: "swalPopup",
            cancelButton: "swalCancel",
            confirmButton: "swalConfirm",
        },
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: "Add",
        allowOutsideClick: false,
        html: `
            <form class='config'>
                <label>Room name</label>
                <input type='text' oninput='FORM_DATA.name=value'>
                <br/>
                <br/>
                <label>Room type</label>
                <select oninput='FORM_DATA.type=value'>
                    <option value='TEXT'>Text</option>
                    <option value='WEBRTC'>Voice (WebRTC)</option>
                </select>
            </form>       
        `,
    }).then(async (result) => {
        if (result.value) {
            const result = await putRequestOnCore(`/server/${current.server.id}/room`, { name: FORM_DATA.name, type: FORM_DATA.type });
            loadRooms();
        }
    });
}

async function configEditRoom(data) {
    FORM_DATA.name = data.name;

    Swal.fire({
        title: `Edit room '${data.name}'`,
        animation: false,
        customClass: {
            title: "swalTitle",
            popup: "swalPopup",
            cancelButton: "swalCancel",
            confirmButton: "swalConfirm",
        },
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: "Edit",
        allowOutsideClick: false,
        html: `
            <form class='config'>
                <label>Room name</label>
                <input type='text' oninput='FORM_DATA.name=value' value='${data.name}'>
            </form>       
        `,
    }).then(async (result) => {
        if (result.value) {
            const result = await patchRequestOnCore(`/room/${data.id}`, { name: FORM_DATA.name, type: FORM_DATA.type });
            loadRooms();
        }
    });
}

async function configDeleteRoom(data) {
    Swal.fire({
        title: `Delete room '${data.name}'`,
        animation: false,
        customClass: {
            title: "swalTitle",
            popup: "swalPopup",
            cancelButton: "swalConfirm",
            confirmButton: "swalCancel", // Swapped on purpose !
        },
        showCancelButton: true,
        focusCancel: true,
        confirmButtonText: "Delete",
        allowOutsideClick: false,
    }).then(async (result) => {
        if (result.value) {
            const result = await deleteRequestOnCore(`/room/${data.id}`);
            loadRooms();
        }
    });
}
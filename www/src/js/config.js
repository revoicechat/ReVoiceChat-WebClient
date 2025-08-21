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

    DIV.innerHTML = `
        <div class="name">${data.name}</div>
        <div class="context-menu">
            <div class="icon" onclick="configEditRoom('${data.id}')">
                <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 16 16">
                    <path clip-rule="evenodd" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.596l-2.047.848a.75.75 0 0 1-.98-.98l.848-2.047a2.75 2.75 0 0 1 .596-.892l7.262-7.261Z" fill-rule="evenodd"></path>
                </svg>
            </div>
            <div class="icon" onclick="configDeleteRoom('${data.id}')">
                <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 16 16">
                    <path clip-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" fill-rule="evenodd"></path>
                </svg>
            </div>
        </div>
    `;

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

async function configAddRoom() {
    const result = await putRequestOnCore(`/server/${current.server.id}/room`, { name: 'New room', type: 'TEXT' });
    loadRooms();
}

async function configEditRoom(data){

}

async function configDeleteRoom(id){
    const result = await deleteRequestOnCore(`/room/${id}`);
    loadRooms();
}
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
            roomList.appendChild(await createRoom(result[neddle]));
        }
    }
}

async function createRoom(data) {
    console.log(data);
    const DIV = document.createElement('div');
    DIV.id = data.id;
    DIV.className = "config-item";

    DIV.innerHTML = `
        <div>
            <div class="name">${data.name}</div>
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
                userList.appendChild(await createUser(sortedByDisplayName[neddle]));
            }
        }
    }
}

async function createUser(data) {
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

function updateServerName(input){
}
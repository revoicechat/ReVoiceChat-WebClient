async function getUsername() {
    const result = await fetchCoreAPI(`/user/me`, 'GET');

    if (result !== null) {
        global.user = result;

        document.getElementById("user-name").innerText = result.displayName;
        document.getElementById("user-status").innerText = result.status;
        document.getElementById("user-dot").className = `user-dot ${statusToDotClassName(result.status)}`;
        document.getElementById("user-picture").src = `${global.url.media}/profiles/${result.id}`;
    }
}

async function getServerUsers(serverId) {
    const result = await fetchCoreAPI(`/server/${serverId}/user`, 'GET');

    if (result !== null) {
        const sortedByDisplayName = [...result].sort((a, b) => {
            return a.displayName.localeCompare(b.displayName);
        });

        const sortedByStatus = [...sortedByDisplayName].sort((a, b) => {
            if (a.status === b.status) {
                return 0;
            }
            else {
                if (a.status === "OFFLINE") {
                    return 1;
                }
                if (b.status === "OFFLINE") {
                    return -1;
                }
            }
        });

        const userList = document.getElementById("user-list");
        userList.innerHTML = "";

        let tempList = [];

        for (const user of sortedByStatus) {
            tempList.push(user.id);
        }

        for (const user of sortedByStatus) {
            userList.appendChild(await createUser(user));
        }
    }
}

async function createUser(data) {
    const DIV = document.createElement('div');
    DIV.id = data.id;
    DIV.className = "user-profile";
    const profilePicture = `${global.url.media}/profiles/${data.id}`;
    DIV.innerHTML = `
        <div class="relative">
            <img src="${profilePicture}" alt="PFP" class="icon ring-2" />
            <div id="dot-${data.id}" class="user-dot ${statusToDotClassName(data.status)}"></div>
        </div>
        <div class="user">
            <h2 class="name">${data.displayName}</h2>
        </div>
    `;

    return DIV;
}

function statusToDotClassName(status) {
    switch (status) {
        case "ONLINE":
            return "user-dot-online";
        case "AWAY":
            return "user-dot-away";
        case "DO_NOT_DISTURB":
            return "user-dot-dnd";
        case "INVISIBLE":
        default:
            return "user-dot-offline";
    }
}
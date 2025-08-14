let hostUrl = "https://srv.revoicechat.fr";

const currentState = {
    server:{
        id: null,
    },
    room: {
        id: null,
    }
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
        allowEscapeKey: false,
        confirmButtonText: "Connect"
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
        loadingSwal.close();
        buildServerList(body);
        selectServer(body[0].id);

    }).catch((error) => {
        console.log(error)
    });
}

function buildServerList(data) {
    /*const serverList = document.getElementById("srv-list");
    for (const neddle in data) {
        serverList.appendChild(createAnchor(data[neddle].name, () => selectServer(data[neddle].id), data[neddle].id));
    }*/
}

function selectServer(serverId) {
    console.log(`Selected server : ${serverId}`);
    currentState.server.id = serverId;
    getRooms(serverId);
}

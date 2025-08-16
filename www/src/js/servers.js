let hostUrl = "https://srv.revoicechat.fr";

const currentState = {
    server: {
        id: null,
    },
    room: {
        id: null,
        sse: null,
    }
}

// Ready state
document.addEventListener('DOMContentLoaded', function () {
    Swal.fire({
        icon: "question",
        title: "Login",
        html: `<form id='swal-form'>
            <label>Host</label>
            <br/>
            <input type='text' name='host' class='swal2-input' placeholder='https://srv.revoicechat.fr' value='${hostUrl}'>

            <br/>
            <label>Username</label>
            <br/>
            <input type='text' name='username' class='swal2-input'>

            <br/>
            <label>Password</label>
            <br/>
            <input type='password' name='password' class='swal2-input'>

            </form>`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        confirmButtonText: "Connect",
        width: "40em",
    }).then((result) => {
        if (result.value) {
            const FORM = document.getElementById("swal-form");
            const LOGIN = {
                'username': FORM.username.value,
                'password': FORM.password.value,
            };

            hostUrl = FORM.host.value;

            let connectingSwal = Swal.fire({
                icon: "info",
                title: `Connecting to\n ${hostUrl}`,
                focusConfirm: false,
                allowOutsideClick: false,
                timerProgressBar: true,
                animation: false,
                didOpen: () => {
                    Swal.showLoading();
                    login(LOGIN, connectingSwal);
                }
            })
        }
    })
});

function login(loginData, connectingSwal) {
    fetch(`${hostUrl}/login`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
        headers: {
            'Content-Type': 'application/json'
        },
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(loginData),
    }).then((response) => {
        if (!response.ok) {
            console.error('Login failed');
            return;
        }
        connectingSwal.close();

        let loadingSwal = Swal.fire({
            icon: "info",
            title: `Loading server list from host\n ${hostUrl}`,
            focusConfirm: false,
            allowOutsideClick: false,
            timerProgressBar: true,
            animation: false,
            didOpen: () => {
                Swal.showLoading();
                getServers(loadingSwal);
            }
        })
    })
}

async function getServers(loadingSwal) {
    fetch(`${hostUrl}/server`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
    }).then((response) => {
        if (!response.ok) {
            return;
        }
        return response.json();
    }).then((body) => {
        loadingSwal.close();
        buildServerList(body);
        selectServer(body[0]);
    })
}

function buildServerList(data) {
    /*const serverList = document.getElementById("srv-list");
    for (const neddle in data) {
        serverList.appendChild(createAnchor(data[neddle].name, () => selectServer(data[neddle].id), data[neddle].id));
    }*/
}

function selectServer(serverData) {
    console.log(`Selected server : ${serverData.id}`);
    currentState.server.id = serverData.id;
    document.getElementById("server-name").innerText = serverData.name;
    getRooms(serverData.id);
}

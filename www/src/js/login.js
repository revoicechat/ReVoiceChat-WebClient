document.addEventListener('DOMContentLoaded', function () {
    // Set theme
    document.documentElement.setAttribute("data-theme", localStorage.getItem("Theme") || "default");

    // Clear old session data
    sessionStorage.removeItem('lastState');

    autoHost();
});

document.getElementById("login-form").addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        userLogin();
    }
});

function userLogin() {
    const FORM = document.getElementById("login-form");
    const LOGIN = {
        'username': FORM.username.value,
        'password': FORM.password.value,
    };

    // Validate URL
    try {
        inputHost = new URL(FORM.host.value);
        login(LOGIN, inputHost.origin);
    }
    catch(e){
        console.error(e);
    }
}

async function login(loginData, host) {
    try {
        const response = await fetch(`${host}/login`, {
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify(loginData),
        });

        if(!response.ok){
            throw "Not OK";
        }

        sessionStorage.setItem('url.core', host);
        document.location.href = `app.html`;
    }
    catch (error) {
        console.error("Error while login : ", error);
        Swal.fire({
            icon: "error",
            title: `Unable to connect to\n ${host}`,
            focusConfirm: false,
            allowOutsideClick: false,
            animation: false,
        })
    }
}

function autoHost(){
    const hostInput = document.getElementById('host');

    switch(document.location.origin){
        case "http://localhost":
        case "https://app.dev.revoicechat.fr":
            hostInput.value = "https://core.dev.revoicechat.fr";
            break;

        case "https://app.revoicechat.fr":
            hostInput.value = "https://core.revoicechat.fr";
            break;
    }
}
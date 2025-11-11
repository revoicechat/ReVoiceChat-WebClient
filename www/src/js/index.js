document.addEventListener('DOMContentLoaded', async function () {
    sessionStorage.removeItem('lastState');
    await autoLogin();
    autoHost();

    // Last login
    if (localStorage.getItem("lastUsername")) {
        document.getElementById("username").value = localStorage.getItem("lastUsername");
    }

    // Got here from invitation link
    if (getQueryVariable('register') === "") {
        document.getElementById('register-invitation').value = getQueryVariable('invitation') ? getQueryVariable('invitation') : "";
        document.getElementById('register-host').value = getQueryVariable('host') ? getQueryVariable('host') : "";
        switchToRegister();
    }
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
        const inputHost = new URL(FORM.host.value);
        login(LOGIN, tauriActive ? inputHost.href : inputHost.origin);
    }
    catch (e) {
        Swal.fire({
            icon: 'error',
            title: `Unable to login`,
            error: e,
            animation: false,
            customClass: SwalCustomClass,
            showCancelButton: false,
            confirmButtonText: "OK",
            allowOutsideClick: false,
        });
    }
}

async function login(loginData, host) {
    const spinner = new SpinnerOnButton("login-button")
    try {
        spinner.run()
        const response = await apiFetch(`${host}/api/auth/login`, {
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify(loginData),
        });

        if (!response.ok) {
            spinner.error()
            throw new Error("Not OK");
        }

        // Local storage
        localStorage.setItem("lastHost", host);
        localStorage.setItem("lastUsername", loginData.username);

        const jwtToken = await response.text();
        setCookie('jwtToken', jwtToken, 1);
        spinner.success()
        document.location.href = `app.html`;
    }
    catch (error) {
        console.error(error.name);
        console.error(error.message);
        console.error(error.cause);
        console.error(error.stack);
        spinner.error()
        Swal.fire({
            icon: "error",
            title: `Unable to connect to\n ${host}`,
            error: error,
            focusConfirm: false,
            allowOutsideClick: false,
            animation: false,
            customClass: {
                title: "swalTitle",
                popup: "swalPopup",
                cancelButton: "swalCancel",
                confirmButton: "swalConfirm",
            },
        })
    }
}

function autoHost() {
    switch (document.location.origin) {
        case "https://dev.revoicechat.fr":
            document.getElementById("login-form").host.value = "https://dev.revoicechat.fr";
            document.getElementById("register-form").host.value = "https://dev.revoicechat.fr";
            break;

        case "https://app.revoicechat.fr":
            document.getElementById("login-form").host.value = "https://app.revoicechat.fr";
            document.getElementById("register-form").host.value = "https://app.revoicechat.fr";
            break;
        default:
            if (localStorage.getItem("lastHost")) {
                document.getElementById("login-form").host.value = localStorage.getItem("lastHost");
                document.getElementById("register-form").host.value = localStorage.getItem("lastHost");
            }
            break;
    }
}

function switchToRegister() {
    document.getElementById('login-form').classList.add("hidden");
    document.getElementById('register-form').classList.remove("hidden");
}

function switchToLogin() {
    document.getElementById('login-form').classList.remove("hidden");
    document.getElementById('register-form').classList.add("hidden");
}

function userRegister() {
    const FORM = document.getElementById("register-form");
    const REGISTER = {
        'username': FORM.username.value,
        'password': FORM.password.value,
        'email': FORM.email.value,
        'invitationLink': FORM.invitation.value
    };

    // Validate URL
    try {
        const inputHost = new URL(FORM.host.value);
        register(REGISTER, inputHost.origin);
    }
    catch (e) {
        Swal.fire({
            icon: 'error',
            title: `Unable to register`,
            text: e,
            animation: false,
            customClass: SwalCustomClass,
            showCancelButton: false,
            confirmButtonText: "OK",
            allowOutsideClick: false,
        });
    }
}

async function register(loginData, host) {
    try {
        const response = await apiFetch(`${host}/api/auth/signup`, {
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'PUT',
            body: JSON.stringify(loginData),
        });

        if (!response.ok) {
            throw new Error("Not OK");
        }

        Swal.fire({
            icon: "success",
            title: `You can now login to\n ${host}`,
            focusConfirm: false,
            allowOutsideClick: false,
            animation: false,
        }).then(() => {
            document.location.reload();
        })
    }
    catch (error) {
        Swal.fire({
            icon: "error",
            title: `Unable to register to\n ${host}`,
            text: error,
            focusConfirm: false,
            allowOutsideClick: false,
            animation: false,
        })
    }
}

async function autoLogin() {
    const storedToken = getCookie('jwtToken');
    const storedCoreUrl = localStorage.getItem("lastHost");
    if (storedToken && storedCoreUrl) {
        try {
            const response = await apiFetch(`${storedCoreUrl}/api/user/me`, {
                cache: "no-store",
                signal: AbortSignal.timeout(5000),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${storedToken}`
                },
                method: 'GET',
            });

            if (response.ok) {
                document.location.href = `app.html`;
            }
        }
        catch (error) {
            console.error(error);
        }
    }
}
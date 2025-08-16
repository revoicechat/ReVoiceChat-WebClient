let host = null;

function userLogin() {
    const FORM = document.getElementById("login-form");
    const LOGIN = {
        'username': FORM.username.value,
        'password': FORM.password.value,
    };

    host = FORM.host.value;

    let connectingSwal = Swal.fire({
        icon: "info",
        title: `Connecting to\n ${host}`,
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

async function login(loginData, connectingSwal) {
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

        const result = await response.ok;

        connectingSwal.close();

        document.location.href = `app.html?host=${host}`;
    }
    catch (error) {
        connectingSwal.close();
        console.error("Error while login : ", error);
    }
}
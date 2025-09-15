const currentSetting = {
    active: null,
    password: {
        password: '',
        newPassword: '',
        confirmPassword: '',
    },
}

function settingLoad() {
    document.getElementById("setting-user-name").value = global.user.displayName;
    document.getElementById("setting-user-theme").value = localStorage.getItem("Theme");
    selectSettingItem("overview");
}

function selectSettingItem(name) {
    if (currentSetting.active !== null) {
        document.getElementById(`setting-tab-${currentSetting.active}`).classList.remove("active");
        document.getElementById(`setting-content-${currentSetting.active}`).classList.add("hidden");
    }

    currentSetting.active = name;
    document.getElementById(`setting-tab-${name}`).classList.add('active');
    document.getElementById(`setting-content-${name}`).classList.remove('hidden');
}

function changeTheme(theme) {
    localStorage.setItem("Theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
}

async function settingDisplayName(input) {
    const displayName = input.value;

    if (displayName === "" || displayName === null || displayName === undefined) {
        console.error("Display name is incorrect");
        return;
    }

    const result = await fetchCoreAPI(`/user/me`, 'PATCH', { displayName: displayName });

    if (result) {
        document.getElementById('config-user-name').value = result.displayName;
        global.user.displayName = result.displayName
    }
}

function settingPassword() {
    Swal.fire({
        title: `Change password`,
        animation: false,
        customClass: {
            title: "swalTitle",
            popup: "swalPopup",
            cancelButton: "swalCancel",
            confirmButton: "swalConfirm",
        },
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: "Change",
        allowOutsideClick: false,
        html: `
            <form class='popup'>
                <label>Current password</label>
                <input type='password' oninput='currentSetting.password.password=this.value'>
                <br/>
                <br/>
                <label>New password</label>
                <input type='password' oninput='currentSetting.password.newPassword=this.value'>
                <br/>
                <br/>
                <label>Confirm new password</label>
                <input type='password' oninput='currentSetting.password.confirmPassword=this.value'>
            </form>       
        `,
    }).then(async (result) => {
        if (result.value) {
            await fetchCoreAPI(`/user/me`, 'PATCH', { password: currentSetting.password });

        }
    });
}
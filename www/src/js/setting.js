const currentSetting = {
    active: null,
    password:{
        password: '',
        newPassword: '',
        confirmPassword: '',
    },
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('config-user-name').value = global.user.displayName;
    document.getElementById("config-user-theme").value = localStorage.getItem("Theme");
    selectSettingItem("overview");
});

document.getRootNode().addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.location.href = "app.html";
    }
});

function selectSettingItem(name) {
    if (currentSetting.active !== null) {
        document.getElementById(currentSetting.active).classList.remove("active");
        document.getElementById(`${currentSetting.active}-config`).classList.add("hidden");
    }

    currentSetting.active = name;
    document.getElementById(name).classList.add('active');
    document.getElementById(`${name}-config`).classList.remove('hidden');

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

    const result = await patchCoreAPI(`/user/me`, { displayName: displayName });

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
            <form class='config'>
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
            const result = await patchCoreAPI(`/user/me`, { password: currentSetting.password });
            
        }
    });
}
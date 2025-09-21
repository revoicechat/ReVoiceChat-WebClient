const currentSetting = {
    active: null,
    password: {
        password: '',
        newPassword: '',
        confirmPassword: '',
    },
}

function settingLoad() {
    document.getElementById("setting-user-uuid").innerText = global.user.id;
    document.getElementById("setting-user-name").value = global.user.displayName;
    document.getElementById("setting-user-theme").value = localStorage.getItem("Theme");
    settingCompressorShow();
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
        console.error("Display name is not valid");
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
                <label>Confirm password</label>
                <input type='password' oninput='currentSetting.password.confirmPassword=this.value'>
            </form>       
        `,
    }).then(async (result) => {
        if (result.value) {
            await fetchCoreAPI(`/user/me`, 'PATCH', { password: currentSetting.password });

        }
    });
}

function settingCompressorDirectShow(param, element) {
    switch (param) {
        case 'attack':
            document.getElementById('compressor-attack-label').innerText = `Attack : ${element.value * 1000}ms`;
            break;
        case 'ratio':
            document.getElementById('compressor-ratio-label').innerText = `Ratio : ${element.value}`;
            break;
        case 'reduction':
            document.getElementById('compressor-reduction-label').innerText = `Reduction : ${element.value}dB`;
            break;
        case 'release':
            document.getElementById('compressor-release-label').innerText = `Release : ${element.value * 1000}ms`;
            break;
        case 'threshold':
            document.getElementById('compressor-threshold-label').innerText = `Threshold : ${element.value}dB`;
            break;
    }
}

function settingCompressorShow() {
    const buttonEnabled = document.getElementById('compressor-enabled')
    if (voice.compressorSetting.enabled) {
        buttonEnabled.innerText = "Enabled";
        buttonEnabled.classList.remove("disabled");
        buttonEnabled.classList.add("enabled");
    }
    else {
        buttonEnabled.innerText = "Disabled";
        buttonEnabled.classList.add("disabled");
        buttonEnabled.classList.remove("enabled");
    }

    document.getElementById('compressor-attack').value = voice.compressorSetting.attack;
    document.getElementById('compressor-attack').title = voice.compressorSetting.attack * 1000 + "ms";
    document.getElementById('compressor-attack-label').innerText = `Attack : ${voice.compressorSetting.attack * 1000}ms`;

    document.getElementById('compressor-ratio').value = voice.compressorSetting.ratio;
    document.getElementById('compressor-ratio').title = voice.compressorSetting.ratio;
    document.getElementById('compressor-ratio-label').innerText = `Ratio : ${voice.compressorSetting.ratio}`;

    document.getElementById('compressor-reduction').value = voice.compressorSetting.reduction;
    document.getElementById('compressor-reduction').title = voice.compressorSetting.reduction + "dB";
    document.getElementById('compressor-reduction-label').innerText = `Reduction : ${voice.compressorSetting.reduction}dB`;

    document.getElementById('compressor-release').value = voice.compressorSetting.release;
    document.getElementById('compressor-release').title = voice.compressorSetting.release * 1000 + "ms";
    document.getElementById('compressor-release-label').innerText = `Release : ${voice.compressorSetting.release * 1000}ms`;

    document.getElementById('compressor-threshold').value = voice.compressorSetting.threshold;
    document.getElementById('compressor-threshold').title = voice.compressorSetting.threshold + "dB";
    document.getElementById('compressor-threshold-label').innerText = `Threshold : ${voice.compressorSetting.threshold}dB`;
}

function settingCompressorEnabled() {
    voice.compressorSetting.enabled = !voice.compressorSetting.enabled;
    saveUserSetting();
    settingCompressorShow();
}

function settingCompressorUpdate(param, data) {
    switch (param) {
        case 'enabled':
            voice.compressorSetting.enabled = data.checked === "checked";
            break;
        case 'attack':
            voice.compressorSetting.attack = parseFloat(data.value);
            break;
        case 'ratio':
            voice.compressorSetting.ratio = parseInt(data.value);
            break;
        case 'reduction':
            voice.compressorSetting.reduction = parseFloat(data.value);
            break;
        case 'release':
            voice.compressorSetting.release = parseFloat(data.value);
            break;
        case 'threshold':
            voice.compressorSetting.threshold = parseInt(data.value);
            break;
    }

    saveUserSetting();
    settingCompressorShow();
}

function settingCompressorDefault() {
    voice.compressorSetting = {
        enabled: true,
        attack: 0,
        knee: 40,
        ratio: 12,
        reduction: 0,
        release: 0.25,
        threshold: -50,
    }
    saveUserSetting();
    settingCompressorShow();
}
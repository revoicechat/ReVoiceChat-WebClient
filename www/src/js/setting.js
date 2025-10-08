const currentSetting = {
    active: null,
    password: {
        password: '',
        newPassword: '',
        confirmPassword: '',
    },
    voiceAdvanced: false,
}

let newProfilPictureFile = null;

function settingLoad() {
    document.getElementById("setting-user-uuid").innerText = global.user.id;
    document.getElementById("setting-user-name").value = global.user.displayName;
    document.getElementById("setting-user-picture").src = `${global.url.media}/profiles/${global.user.id}`;
    settingThemeShow();
    settingVolumeShow();
    settingNoiseGateShow();
    settingCompressorShow();
    selectSettingItem("overview");

    const settingUserPictureNewPath = document.getElementById("setting-user-picture-new-path");
    const settingUserPictureNewFile = document.getElementById("setting-user-picture-new-file");
    const settingUserPicture = document.getElementById("setting-user-picture");
    newProfilPictureFile = null
    settingUserPictureNewFile.addEventListener("change", () => {
        const file = settingUserPictureNewFile.files[0];
        if (file) {
            newProfilPictureFile = file;
            settingUserPictureNewPath.value = file.name;
            settingUserPicture.src = URL.createObjectURL(file);
            settingUserPicture.style.display = "block";
        }
    });

}

function settingThemeShow() {
    const themeForm = document.getElementById("setting-themes-form");
    let html = "";
    getAllDeclaredDataThemes().forEach(theme => html += `
        <button style="padding: 0" type="button" onclick="changeTheme('${theme}')">
            <revoice-theme-preview theme="${theme}"></revoice-theme-preview>
        </button>`);
    themeForm.innerHTML = html;
    //document.querySelector(`revoice-theme-preview[theme="${localStorage.getItem("Theme")}"]`).parentElement.disabled = true;
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
    document.querySelectorAll("revoice-message").forEach(elt => elt.setAttribute("data-theme", theme));
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelectorAll(`revoice-theme-preview`).forEach(elt => {
        elt.parentElement.disabled = false
    })
    document.querySelector(`revoice-theme-preview[theme="${theme}"]`).parentElement.disabled = true;
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
            await fetchCoreAPI(`/user/me`, 'PATCH', {password: currentSetting.password});

        }
    });
}

async function saveSetting() {
    const spinner = new SpinnerOnButton("save-setting-button")
    spinner.run()
    await settingProfilePicture();
    const settingUserName = document.getElementById("setting-user-name");
    await settingDisplayName(settingUserName.value);
    spinner.success()
}

async function settingDisplayName(displayName) {
    if (displayName === "" || displayName === null || displayName === undefined) {
        console.error("Display name is not valid");
        return;
    }
    const result = await fetchCoreAPI(`/user/me`, 'PATCH', {displayName: displayName});
    if (result) {
        global.user.displayName = result.displayName
        document.getElementById('setting-user-name').value = result.displayName;
    }
}

async function settingProfilePicture() {
    const settingUserPictureNewPath = document.getElementById("setting-user-picture-new-path");
    if (settingUserPictureNewPath.value && newProfilPictureFile) {
        const formData = new FormData();
        formData.append("file", newProfilPictureFile);
        await fetch(`${global.url.media}/profiles/${global.user.id}`, {
            method: "POST",
            signal: AbortSignal.timeout(5000),
            headers: {
                'Authorization': `Bearer ${global.jwtToken}`
            },
            body: formData
        });
        newProfilPictureFile = null
        settingUserPictureNewPath.value = null
    }
}

function uploadNewProfilePicture() {
    const fileInput = document.getElementById("setting-user-picture-new-file");
    fileInput.click();
}

function settingVolumeDirectShow(element) {
    document.getElementById('volume-label').innerText = `Volume ${parseInt(element.value * 100)}%`;
}

function settingVolumeShow() {
    document.getElementById('volume-label').innerText = `Volume ${parseInt(voice.settings.self.volume * 100)}%`;
    document.getElementById('volume-input').value = voice.settings.self.volume;
}

function settingVolumeUpdate(data) {
    voice.settings.self.volume = parseFloat(data.value)
    appSaveSettings();
    settingVolumeShow();
    voiceUpdateSelfVolume();
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
    if (voice.settings.compressor.enabled) {
        buttonEnabled.innerText = "Enabled";
        buttonEnabled.classList.remove("disabled");
        buttonEnabled.classList.add("enabled");
    } else {
        buttonEnabled.innerText = "Disabled";
        buttonEnabled.classList.add("disabled");
        buttonEnabled.classList.remove("enabled");
    }

    document.getElementById('compressor-attack').value = voice.settings.compressor.attack;
    document.getElementById('compressor-attack').title = voice.settings.compressor.attack * 1000 + "ms";
    document.getElementById('compressor-attack-label').innerText = `Attack : ${voice.settings.compressor.attack * 1000}ms`;

    document.getElementById('compressor-ratio').value = voice.settings.compressor.ratio;
    document.getElementById('compressor-ratio').title = voice.settings.compressor.ratio;
    document.getElementById('compressor-ratio-label').innerText = `Ratio : ${voice.settings.compressor.ratio}`;

    document.getElementById('compressor-reduction').value = voice.settings.compressor.reduction;
    document.getElementById('compressor-reduction').title = voice.settings.compressor.reduction + "dB";
    document.getElementById('compressor-reduction-label').innerText = `Reduction : ${voice.settings.compressor.reduction}dB`;

    document.getElementById('compressor-release').value = voice.settings.compressor.release;
    document.getElementById('compressor-release').title = voice.settings.compressor.release * 1000 + "ms";
    document.getElementById('compressor-release-label').innerText = `Release : ${voice.settings.compressor.release * 1000}ms`;

    document.getElementById('compressor-threshold').value = voice.settings.compressor.threshold;
    document.getElementById('compressor-threshold').title = voice.settings.compressor.threshold + "dB";
    document.getElementById('compressor-threshold-label').innerText = `Threshold : ${voice.settings.compressor.threshold}dB`;
}

function settingCompressorEnabled() {
    voice.settings.compressor.enabled = !voice.settings.compressor.enabled;
    appSaveSettings();
    settingCompressorShow();
}

function settingCompressorUpdate(param, data) {
    switch (param) {
        case 'enabled':
            voice.settings.compressor.enabled = data.checked === "checked";
            break;
        case 'attack':
            voice.settings.compressor.attack = parseFloat(data.value);
            break;
        case 'ratio':
            voice.settings.compressor.ratio = parseInt(data.value);
            break;
        case 'reduction':
            voice.settings.compressor.reduction = parseFloat(data.value);
            break;
        case 'release':
            voice.settings.compressor.release = parseFloat(data.value);
            break;
        case 'threshold':
            voice.settings.compressor.threshold = parseInt(data.value);
            break;
    }

    appSaveSettings();
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
    appSaveSettings();
    settingCompressorShow();
}

function settingNoiseGateDirectShow(param, element) {
    switch (param) {
        case 'attack':
            document.getElementById('noise-gate-attack-label').innerText = `Attack : ${element.value * 1000}ms`;
            break;
        case 'release':
            document.getElementById('noise-gate-release-label').innerText = `Release : ${element.value * 1000}ms`;
            break;
        case 'threshold': {
            if (currentSetting.voiceAdvanced) {
                document.getElementById('noise-gate-threshold-label').innerText = `Threshold : ${element.value}dB`;
            } else {
                document.getElementById('noise-gate-threshold-label').innerText = `Sensitivity ${element.value}dB`;
            }
            break;
        }
    }
}

function settingNoiseGateShow() {
    document.getElementById('noise-gate-attack').value = voice.settings.gate.attack;
    document.getElementById('noise-gate-attack').title = voice.settings.gate.attack * 1000 + "ms";
    document.getElementById('noise-gate-attack-label').innerText = `Attack : ${voice.settings.gate.attack * 1000}ms`;

    document.getElementById('noise-gate-release').value = voice.settings.gate.release;
    document.getElementById('noise-gate-release').title = voice.settings.gate.release * 1000 + "ms";
    document.getElementById('noise-gate-release-label').innerText = `Release : ${voice.settings.gate.release * 1000}ms`;

    document.getElementById('noise-gate-threshold').value = voice.settings.gate.threshold;
    document.getElementById('noise-gate-threshold').title = voice.settings.gate.threshold + "dB";

    if (currentSetting.voiceAdvanced) {
        document.getElementById('noise-gate-threshold-label').innerText = `Threshold : ${voice.settings.gate.threshold}dB`;
    } else {
        document.getElementById('noise-gate-threshold-label').innerText = `Sensitivity ${voice.settings.gate.threshold}dB`;
    }
}

function settingNoiseGateUpdate(param, data) {
    switch (param) {
        case 'attack':
            voice.settings.gate.attack = parseFloat(data.value);
            break;
        case 'release':
            voice.settings.gate.release = parseFloat(data.value);
            break;
        case 'threshold':
            voice.settings.gate.threshold = parseInt(data.value);
            break;
    }

    appSaveSettings();
    voiceUpdateGate();
    settingNoiseGateShow();
}

function settingNoiseGateDefault() {
    voice.settings.gate = {
        attack: 0.01,
        release: 0.4,
        threshold: -45,
    }
    appSaveSettings();
    voiceUpdateGate();
    settingNoiseGateShow();
}

function settingVoiceMode() {
    currentSetting.voiceAdvanced = !currentSetting.voiceAdvanced;

    const button = document.getElementById("voice-mode");
    if (currentSetting.voiceAdvanced) {
        button.innerText = "Simple";
        document.getElementById('voice-sensitivity').innerText = "Noise gate";
        document.getElementById('noise-gate-threshold-label').innerText = `Threshold : ${voice.settings.gate.threshold}dB`;
    } else {
        button.innerText = "Advanced";
        document.getElementById('voice-sensitivity').innerText = "Voice detection";
        document.getElementById('noise-gate-threshold-label').innerText = `Sensitivity ${voice.settings.gate.threshold}dB`;
    }

    const toggleable = document.getElementsByClassName('voice-toggleable');
    for (element of toggleable) {
        if (currentSetting.voiceAdvanced) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    }
}
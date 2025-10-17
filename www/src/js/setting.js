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
    document.getElementById("setting-user-uuid").innerText = RVC.user.id;
    document.getElementById("setting-user-name").value = RVC.user.displayName;
    document.getElementById("setting-user-picture").src = `${RVC.mediaUrl}/profiles/${RVC.user.id}`;
    settingThemeShow();
    settingEmoteShow();
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
    for (const theme of getAllDeclaredDataThemes()) {
        html += `<button style="padding: 0" class="theme-select-button" type="button" onclick="changeTheme('${theme}')">
                     <revoice-theme-preview theme="${theme}"></revoice-theme-preview>
                 </button>`;
    }
    themeForm.innerHTML = html;
}

function settingEmoteShow() {
    RVC.fetcher.fetchCore(`/emote/me`).then(response => {
        const emoteForm = document.getElementById("setting-emotes-form");
        emoteForm.innerHTML = `
            <script type="application/json" slot="emojis-data">
                ${JSON.stringify(response)}
            </script>`;
    });
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
    for (const elt of document.querySelectorAll("revoice-message")) {
        elt.dataset.theme = theme;
    }
    document.documentElement.dataset.theme = theme;
    for (const elt of document.querySelectorAll(`revoice-theme-preview`)) {
        elt.parentElement.disabled = false
    }
    document.querySelector(`revoice-theme-preview[theme="${theme}"]`).parentElement.disabled = true;
}

function settingPassword() {
    Swal.fire({
        title: `Change password`,
        animation: false,
        customClass: SwalCustomClass,
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
            await RVC.fetcher.fetchCore(`/user/me`, 'PATCH', { password: currentSetting.password });

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
        Swal.fire({
            icon: 'error',
            title: `Display name invalid`,
            animation: false,
            customClass: SwalCustomClass,
            showCancelButton: false,
            confirmButtonText: "OK",
            allowOutsideClick: false,
        });
        return;
    }
    const result = await RVC.fetcher.fetchCore(`/user/me`, 'PATCH', { displayName: displayName });
    if (result) {
        RVC.user.displayName = result.displayName
        document.getElementById('setting-user-name').value = result.displayName;
    }
}

async function settingProfilePicture() {
    const settingUserPictureNewPath = document.getElementById("setting-user-picture-new-path");
    if (settingUserPictureNewPath.value && newProfilPictureFile) {
        const formData = new FormData();
        formData.append("file", newProfilPictureFile);
        await fetch(`${RVC.mediaUrl}/profiles/${RVC.user.id}`, {
            method: "POST",
            signal: AbortSignal.timeout(5000),
            headers: {
                'Authorization': `Bearer ${RVC.getToken()}`
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
    document.getElementById('volume-label').innerText = `Volume ${Number.parseInt(element.value * 100)}%`;
}

function settingVolumeShow() {
    document.getElementById('volume-label').innerText = `Volume ${Number.parseInt(RVC.user.voiceSettings.self.volume * 100)}%`;
    document.getElementById('volume-input').value = RVC.user.voiceSettings.self.volume;
}

function settingVolumeUpdate(data) {
    RVC.user.voiceSettings.self.volume = Number.parseFloat(data.value)
    RVC.user.saveSettings();
    settingVolumeShow();
    RVC.room.voiceController.setSelfVolume();
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
    if (RVC.user.voiceSettings.compressor.enabled) {
        buttonEnabled.innerText = "Enabled";
        buttonEnabled.classList.remove("disabled");
        buttonEnabled.classList.add("enabled");
    } else {
        buttonEnabled.innerText = "Disabled";
        buttonEnabled.classList.add("disabled");
        buttonEnabled.classList.remove("enabled");
    }

    document.getElementById('compressor-attack').value = RVC.user.voiceSettings.compressor.attack;
    document.getElementById('compressor-attack').title = RVC.user.voiceSettings.compressor.attack * 1000 + "ms";
    document.getElementById('compressor-attack-label').innerText = `Attack : ${RVC.user.voiceSettings.compressor.attack * 1000}ms`;

    document.getElementById('compressor-ratio').value = RVC.user.voiceSettings.compressor.ratio;
    document.getElementById('compressor-ratio').title = RVC.user.voiceSettings.compressor.ratio;
    document.getElementById('compressor-ratio-label').innerText = `Ratio : ${RVC.user.voiceSettings.compressor.ratio}`;

    document.getElementById('compressor-reduction').value = RVC.user.voiceSettings.compressor.reduction;
    document.getElementById('compressor-reduction').title = RVC.user.voiceSettings.compressor.reduction + "dB";
    document.getElementById('compressor-reduction-label').innerText = `Reduction : ${RVC.user.voiceSettings.compressor.reduction}dB`;

    document.getElementById('compressor-release').value = RVC.user.voiceSettings.compressor.release;
    document.getElementById('compressor-release').title = RVC.user.voiceSettings.compressor.release * 1000 + "ms";
    document.getElementById('compressor-release-label').innerText = `Release : ${RVC.user.voiceSettings.compressor.release * 1000}ms`;

    document.getElementById('compressor-threshold').value = RVC.user.voiceSettings.compressor.threshold;
    document.getElementById('compressor-threshold').title = RVC.user.voiceSettings.compressor.threshold + "dB";
    document.getElementById('compressor-threshold-label').innerText = `Threshold : ${RVC.user.voiceSettings.compressor.threshold}dB`;
}

function settingCompressorEnabled() {
    RVC.user.voiceSettings.compressor.enabled = !RVC.user.voiceSettings.compressor.enabled;
    RVC.user.saveSettings();
    settingCompressorShow();
}

function settingCompressorUpdate(param, data) {
    switch (param) {
        case 'enabled':
            RVC.user.voiceSettings.compressor.enabled = data.checked === "checked";
            break;
        case 'attack':
            RVC.user.voiceSettings.compressor.attack = Number.parseFloat(data.value);
            break;
        case 'ratio':
            RVC.user.voiceSettings.compressor.ratio = Number.parseInt(data.value);
            break;
        case 'reduction':
            RVC.user.voiceSettings.compressor.reduction = Number.parseFloat(data.value);
            break;
        case 'release':
            RVC.user.voiceSettings.compressor.release = Number.parseFloat(data.value);
            break;
        case 'threshold':
            RVC.user.voiceSettings.compressor.threshold = Number.parseInt(data.value);
            break;
    }

    RVC.user.saveSettings();
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
    RVC.user.saveSettings();
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
    document.getElementById('noise-gate-attack').value = RVC.user.voiceSettings.gate.attack;
    document.getElementById('noise-gate-attack').title = RVC.user.voiceSettings.gate.attack * 1000 + "ms";
    document.getElementById('noise-gate-attack-label').innerText = `Attack : ${RVC.user.voiceSettings.gate.attack * 1000}ms`;

    document.getElementById('noise-gate-release').value = RVC.user.voiceSettings.gate.release;
    document.getElementById('noise-gate-release').title = RVC.user.voiceSettings.gate.release * 1000 + "ms";
    document.getElementById('noise-gate-release-label').innerText = `Release : ${RVC.user.voiceSettings.gate.release * 1000}ms`;

    document.getElementById('noise-gate-threshold').value = RVC.user.voiceSettings.gate.threshold;
    document.getElementById('noise-gate-threshold').title = RVC.user.voiceSettings.gate.threshold + "dB";

    if (currentSetting.voiceAdvanced) {
        document.getElementById('noise-gate-threshold-label').innerText = `Threshold : ${RVC.user.voiceSettings.gate.threshold}dB`;
    } else {
        document.getElementById('noise-gate-threshold-label').innerText = `Sensitivity ${RVC.user.voiceSettings.gate.threshold}dB`;
    }
}

function settingNoiseGateUpdate(param, data) {
    switch (param) {
        case 'attack':
            RVC.user.voiceSettings.gate.attack = Number.parseFloat(data.value);
            break;
        case 'release':
            RVC.user.voiceSettings.gate.release = Number.parseFloat(data.value);
            break;
        case 'threshold':
            RVC.user.voiceSettings.gate.threshold = Number.parseInt(data.value);
            break;
    }

    RVC.user.saveSettings();
    voiceUpdateGate();
    settingNoiseGateShow();
}

function settingNoiseGateDefault() {
    RVC.user.voiceSettings.gate = {
        attack: 0.01,
        release: 0.4,
        threshold: -45,
    }
    RVC.user.saveSettings();
    voiceUpdateGate();
    settingNoiseGateShow();
}

function settingVoiceMode() {
    currentSetting.voiceAdvanced = !currentSetting.voiceAdvanced;

    const button = document.getElementById("voice-mode");
    if (currentSetting.voiceAdvanced) {
        button.innerText = "Simple";
        document.getElementById('voice-sensitivity').innerText = "Noise gate";
        document.getElementById('noise-gate-threshold-label').innerText = `Threshold : ${RVC.user.voiceSettings.gate.threshold}dB`;
    } else {
        button.innerText = "Advanced";
        document.getElementById('voice-sensitivity').innerText = "Voice detection";
        document.getElementById('noise-gate-threshold-label').innerText = `Sensitivity ${RVC.user.voiceSettings.gate.threshold}dB`;
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
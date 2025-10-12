const voice = {
    instance: null,
    activeRoom: null,
    settings: {
        compressor: {},
        gate: {},
        self: {},
        users: {},
    },
}

// <user> call this to join a call in a room
async function voiceJoin(roomId) {
    if (voice.activeRoom) {
        return;
    }

    console.info(`VOICE : Initiate join on room: ${roomId}`);
    voice.activeRoom = roomId;

    try {
        voice.instance = new VoiceCall(RVC_User.getId(), voice.settings);
        await voice.instance.open(RVC.voiceUrl, roomId, RVC.getToken());

        // Update users in room
        await voiceUpdateJoinedUsers();

        // Update self
        voiceUpdateSelf();

        // Update counter
        await voiceUsersCountUpdate(roomId);

        RVC.notification.play('voiceConnected');
    }
    catch (error) {
        console.error(error);
        voice.activeRoom = null;
    }
}

// <user> call this to leave a call in a room
async function voiceLeave() {
    console.info(`VOICE : Leaving voice chat ${voice.activeRoom}`);

    voice.instance.close();
    await voiceUpdateJoinedUsers();
    await voiceUsersCountUpdate(voice.activeRoom);
    voiceUpdateSelf();

    voice.activeRoom = null;

    // Play leave audio
    RVC.notification.play('voiceDisconnected');
}

// <server.js> call this when a new user join the room
async function voiceUserJoining(data) {
    voiceUsersCountUpdate(data.roomId);
    
    if (data.roomId !== RVC.getRoomId()) { return; }

    const userData = data.user;
    const voiceContent = document.getElementById("voice-content");
    voiceContent.appendChild(voiceCreateUserHTML(userData));

    // User joining this is NOT self and current user is connected to voice room
    if (userData.id !== RVC_User.getId() && voice.instance !== null && voice.instance.getState() === VoiceCall.OPEN) {
        voice.instance.addUser(userData.id);
        voiceUpdateUserControls(userData.id);

        RVC.notification.play('voiceUserJoin');
    }
}

// <server.js> call this when a user leave the room
async function voiceUserLeaving(data) {
    voiceUsersCountUpdate(data.roomId);

    if (data.roomId !== RVC.getRoomId()) { return; }

    const userId = data.userId;

    // Remove user from UI
    document.getElementById(`voice-${userId}`).remove();

    // User leaving is NOT self
    if (userId !== RVC_User.getId() && voice.instance !== null && voice.instance.state === VoiceCall.OPEN) {
        voice.instance.removeUser(userId);

        RVC.notification.play('voiceUserLeft');
    }
}

// Show users in a room
async function voiceShowJoinedUsers() {
    const result = await RVC.fetchCore(`/room/${RVC.getRoomId()}/user`, 'GET');

    if (result.connectedUser === null) {
        console.debug("VOICE : No user in room");
        return;
    }

    const connectedUser = result.connectedUser;

    const sortedByDisplayName = [...connectedUser].sort((a, b) => {
        return a.displayName.localeCompare(b.displayName);
    });

    const voiceContent = document.getElementById("voice-content");
    voiceContent.innerHTML = "";

    for (const user of sortedByDisplayName) {
        voiceContent.appendChild(voiceCreateUserHTML(user));
    }

    // Room is currently active
    if (voice.activeRoom === RVC.getRoomId()) {
        voiceUpdateJoinedUsers();
    }
}

// Add or remove controls on users in room
async function voiceUpdateJoinedUsers() {
    const result = await RVC.fetchCore(`/room/${RVC.getRoomId()}/user`, 'GET');

    if (result === null) {
        console.debug("VOICE : No user in room");
        return;
    }

    const connectedUser = result.connectedUser;

    for (const user of connectedUser) {
        const userId = user.id;

        voice.instance.addUser(userId);

        // Not self
        if (RVC_User.getId() !== userId) {
            voiceUpdateUserControls(userId);
        }
    }
}

// Create DOM Element / HTML for a given user
function voiceCreateUserHTML(userData) {
    const userId = userData.id;
    const DIV = document.createElement('div');
    DIV.id = `voice-${userId}`;
    DIV.className = "voice-profile";

    const profilePicture = `${RVC.mediaUrl}/profiles/${userId}`;

    DIV.innerHTML = `
        <div class='block-user' id='voice-gate-${userId}'>
            <div class='relative'>
                <img src='${profilePicture}' alt='PFP' class='icon' />
            </div>
            <div class='user'>
                <h2 class='name'>${userData.displayName}</h2>
            </div>
        </div>
    `;

    return DIV;
}

// <voiceUpdateJoinedUsers> and <voiceUserJoining> call this to update control on given user
function voiceUpdateUserControls(userId) {
    const userDiv = document.getElementById(`voice-${userId}`);

    switch (voice.instance.getState()) {
        case VoiceCall.CLOSE: {
            if (document.getElementById(`voice-controls-${userId}`) !== null) {
                document.getElementById(`voice-controls-${userId}`).remove();
            }
            break;
        }
        case VoiceCall.OPEN: {
            if (document.getElementById(`voice-controls-${userId}`) !== null) {
                console.info('VOICE : There is already controls in this room');
                break;
            }

            if(!voice.settings.users[userId]){
                voice.settings.users[userId] = {volume : 1, muted : false};
            }

            // Add controls
            const INPUT_VOLUME = document.createElement('input');
            INPUT_VOLUME.type = "range";
            INPUT_VOLUME.className = "volume";
            INPUT_VOLUME.step = "0.01";
            INPUT_VOLUME.value = voice.settings.users[userId].volume;
            INPUT_VOLUME.min = "0";
            INPUT_VOLUME.max = "2";
            INPUT_VOLUME.title = INPUT_VOLUME.value * 100 + "%";
            INPUT_VOLUME.oninput = () => voiceControlUserVolume(userId, INPUT_VOLUME);
            voiceControlUserVolume(userId, INPUT_VOLUME);

            const BUTTON_MUTE = document.createElement('button');
            BUTTON_MUTE.className = "mute";
            BUTTON_MUTE.title = "Mute";
            BUTTON_MUTE.onclick = () => voiceControlUserMute(userId, BUTTON_MUTE);
            BUTTON_MUTE.innerHTML = `<revoice-icon-speaker></revoice-icon-speaker>`;
            voiceControlUserMute(userId, BUTTON_MUTE, false);

            const DIV_ACTION = document.createElement('div');
            DIV_ACTION.id = `voice-controls-${userId}`;
            DIV_ACTION.className = "block-action";
            DIV_ACTION.appendChild(INPUT_VOLUME);
            DIV_ACTION.appendChild(BUTTON_MUTE);

            userDiv.appendChild(DIV_ACTION);
            break;
        }
    }
}

// Update user controls and UI
function voiceUpdateSelf() {
    const voiceAction = document.getElementById("voice-join-action");
    const instanceState = voice.instance !== null ? voice.instance.getState() : VoiceCall.CLOSE;

    switch (instanceState) {
        case VoiceCall.CONNECTING:
            // Set disconnect actions
            voiceAction.className = "join";
            voiceAction.classList.add('waiting');
            voiceAction.title = "Waiting to join the room";
            voiceAction.innerHTML = `<revoice-icon-phone-x></revoice-icon-phone-x>`;
            voiceAction.onclick = () => voiceLeave();
            break;

        case VoiceCall.CLOSE:
            // Set connect actions
            document.getElementById(RVC.getRoomId()).classList.remove('active-voice');
            voiceAction.className = "join";
            voiceAction.classList.add('disconnected');
            voiceAction.title = "Join the room";
            voiceAction.innerHTML = `<revoice-icon-phone></revoice-icon-phone>`;
            voiceAction.onclick = () => voiceJoin(RVC.getRoomId());
            break;

        case VoiceCall.OPEN:
            document.getElementById(voice.activeRoom).classList.add('active-voice');
            voiceAction.className = "join";
            voiceAction.classList.add('connected');
            voiceAction.title = "Leave the room";
            voiceAction.innerHTML = `<revoice-icon-phone-x></revoice-icon-phone-x>`;
            voiceAction.onclick = () => voiceLeave();
            break;
    }
}

// <user> call this to mute other user
function voiceControlUserMute(userId, muteButton, updateState = true) {
    if (updateState) {
        voice.instance.toggleUserMute(userId);
    }

    if (voice.instance.getUserMute(userId)) {
        muteButton.classList.add('active');
        muteButton.innerHTML = "<revoice-icon-speaker-x></revoice-icon-speaker-x>";
    }
    else {
        muteButton.classList.remove('active');
        muteButton.innerHTML = "<revoice-icon-speaker></revoice-icon-speaker>";
    }

    voiceSaveSettings();
}

// <user> call this to change volume of other user
function voiceControlUserVolume(userId, volumeInput) {
    const volume = volumeInput.value;

    volumeInput.title = volume * 100 + "%";

    if (voice.instance) {
        voice.instance.setUserVolume(userId, volume);
    }

    voiceSaveSettings();
}

// <user> call this to mute himself
function voiceControlSelfMute(updateState = true) {
    if (updateState) {
        if (voice.instance) {
            voice.instance.toggleSelfMute();
        }
        voiceSaveSettings();
    }

    const muteButton = document.getElementById("voice-self-mute");
    if (voice.instance.getSelfMute()) {
        // Muted
        console.debug("VOICE : Self mute");
        muteButton.classList.add('active');
    }
    else {
        // Unmuted
        console.debug("VOICE : Self unmute");
        muteButton.classList.remove('active');
    }
}

function voiceUpdateSelfVolume() {
    if (voice.instance) {
        voice.instance.setSelfVolume(voice.settings.self.volume);
    }
}

// Count user in room
async function voiceUsersCount(roomId) {
    const result = await RVC.fetchCore(`/room/${roomId}/user`, 'GET');

    if (result.connectedUser === null) {
        return 0;
    }

    return result.connectedUser.length;
}

async function voiceUsersCountUpdate(roomId) {
    const result = await RVC.fetchCore(`/room/${roomId}/user`, 'GET');
    const element = document.getElementById(`room-extension-${roomId}`);

    let count = 0
    if (result.connectedUser !== null) {
        count = result.connectedUser.length
    }

    element.innerHTML = `${count}<revoice-icon-user></revoice-icon-user>`
}

function voiceSaveSettings() {
    if (voice.instance) {
        voice.settings = voice.instance.getSettings();
    }

    RVC_User.saveSettings();
}

function voiceUpdateGate(){
    if(voice.instance){
        voice.instance.setGate(voice.settings.gate);
    }
}
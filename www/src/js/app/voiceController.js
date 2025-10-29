import VoiceCall from "./voiceCall.js";

export default class VoiceController {
    #alert;
    #fetcher;
    #voiceURL;
    #token;
    #voiceCall;
    #activeRoom;
    #user;
    #room;

    constructor(fetcher, voiceURL, token, user, alert, room) {
        this.#fetcher = fetcher;
        this.#voiceURL = voiceURL;
        this.#token = token;
        this.#user = user;
        this.#alert = alert;
        this.#room = room;
    }

    // <user> call this to join a call in a room
    async join(roomId) {
        if (this.#activeRoom) {
            return;
        }

        this.#activeRoom = roomId;

        try {
            this.#voiceCall = new VoiceCall(this.#user.id, this.#user.voiceSettings);
            await this.#voiceCall.open(this.#voiceURL, roomId, this.#token);

            // Update users in room
            await this.#updateJoinedUsers();

            // Update self
            this.updateSelf();

            // Update counter
            this.#updateUserCounter(roomId);

            // Audio alert
            this.#alert.play('voiceConnected');
        }
        catch (error) {
            console.error(error);
            this.#activeRoom = null;
        }
    }

    // <user> call this to leave a call in a room
    async leave() {
        this.#voiceCall.close();
        await this.#updateJoinedUsers();
        this.#updateUserCounter(this.#activeRoom);
        this.updateSelf();

        this.#activeRoom = null;

        // Audio alert
        this.#alert.play('voiceDisconnected');
    }

    // <server.js> call this when a new user join the room
    async userJoining(data) {
        this.#updateUserCounter(data.roomId);

        if (data.roomId !== this.#room.id) { return; }

        const userData = data.user;
        const voiceContent = document.getElementById("voice-content");
        voiceContent.appendChild(this.#createUserElement(userData));

        // User joining this is NOT self and current user is connected to voice room
        if (userData.id !== this.#user.id && this.#voiceCall !== null && this.#voiceCall.getState() === VoiceCall.OPEN) {
            this.#voiceCall.addUser(userData.id);
           this.#updateUserControls(userData.id);
            this.#alert.play('voiceUserJoin');
        }
    }

    // <server.js> call this when a user leave the room
    async userLeaving(data) {
        this.#updateUserCounter(data.roomId);

        if (data.roomId !== this.#room.id) { return; }

        const userId = data.userId;

        // Remove user from UI
        document.getElementById(`voice-${userId}`).remove();

        // User leaving is NOT self
        if (userId !== this.#user.id && this.#voiceCall !== null && this.#voiceCall.state === VoiceCall.OPEN) {
            this.#voiceCall.removeUser(userId);
            this.#alert.play('voiceUserLeft');
        }
    }

    // Show users in a room
    async showJoinedUsers() {
        const result = await this.#fetcher.fetchCore(`/room/${this.#room.id}/user`, 'GET');

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
            voiceContent.appendChild(this.#createUserElement(user));
        }

        // Room is currently active
        if (this.#activeRoom === this.#room.id) {
            this.#updateJoinedUsers();
        }
    }

    // Create DOM Element / HTML for a given user
    #createUserElement(userData) {
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
   #updateUserControls(userId) {
        const userDiv = document.getElementById(`voice-${userId}`);

        switch (this.#voiceCall.getState()) {
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

                if (!this.#user.voiceSettings.users[userId]) {
                    this.#user.voiceSettings.users[userId] = { volume: 1, muted: false };
                }

                // Add controls
                const INPUT_VOLUME = document.createElement('input');
                INPUT_VOLUME.type = "range";
                INPUT_VOLUME.className = "volume";
                INPUT_VOLUME.step = "0.01";
                INPUT_VOLUME.value = this.#user.voiceSettings.users[userId].volume;
                INPUT_VOLUME.min = "0";
                INPUT_VOLUME.max = "2";
                INPUT_VOLUME.title = parseInt(INPUT_VOLUME.value * 100) + "%";
                INPUT_VOLUME.oninput = () => this.#controlUserVolume(userId, INPUT_VOLUME);
                this.#controlUserVolume(userId, INPUT_VOLUME);

                const BUTTON_MUTE = document.createElement('button');
                BUTTON_MUTE.className = "mute";
                BUTTON_MUTE.title = "Mute";
                BUTTON_MUTE.onclick = () => this.#controlUserMute(userId, BUTTON_MUTE);
                BUTTON_MUTE.innerHTML = `<revoice-icon-speaker></revoice-icon-speaker>`;
                this.#controlUserMute(userId, BUTTON_MUTE, false);

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

    // <user> call this to mute other user
    #controlUserMute(userId, muteButton, updateState = true) {
        if (updateState) {
            this.#voiceCall.toggleUserMute(userId);
        }

        if (this.#voiceCall.getUserMute(userId)) {
            muteButton.classList.add('active');
            muteButton.innerHTML = "<revoice-icon-speaker-x></revoice-icon-speaker-x>";
        }
        else {
            muteButton.classList.remove('active');
            muteButton.innerHTML = "<revoice-icon-speaker></revoice-icon-speaker>";
        }

        this.#saveSettings();
    }

    // <user> call this to change volume of other user
    #controlUserVolume(userId, volumeInput) {
        const volume = volumeInput.value;

        volumeInput.title = parseInt(volume * 100) + "%";

        if (this.#voiceCall) {
            this.#voiceCall.setUserVolume(userId, volume);
        }

        this.#saveSettings();
    }

    // <user> call this to mute himself
    controlSelfMute(updateState = true) {
        if (updateState) {
            if (this.#voiceCall) {
                this.#voiceCall.toggleSelfMute();
            }
            this.#saveSettings();
        }

        const muteButton = document.getElementById("voice-self-mute");
        if (this.#voiceCall.getSelfMute()) {
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

    setSelfVolume() {
        if (this.#voiceCall) {
            this.#voiceCall.setSelfVolume(this.#user.voiceSettings.self.volume);
        }
    }

    #saveSettings() {
        if (this.#voiceCall) {
            this.#user.voiceSettings = this.#voiceCall.getSettings();
        }

        this.#user.saveSettings();
    }

    updateGate() {
        if (this.#voiceCall) {
            this.#voiceCall.setGate(this.#user.voiceSettings.gate);
        }
    }

    // Update user controls and UI
    updateSelf() {
        const voiceAction = document.getElementById("voice-join-action");
        const instanceState = this.#voiceCall ? this.#voiceCall.getState() : VoiceCall.CLOSE;

        switch (instanceState) {
            case VoiceCall.CONNECTING:
                // Set disconnect actions
                voiceAction.className = "join";
                voiceAction.classList.add('waiting');
                voiceAction.title = "Waiting to join the room";
                voiceAction.innerHTML = `<revoice-icon-phone-x></revoice-icon-phone-x>`;
                voiceAction.onclick = () => this.leave();
                break;

            case VoiceCall.CLOSE:
                // Set connect actions
                document.getElementById(this.#room.id).classList.remove('active-voice');
                voiceAction.className = "join";
                voiceAction.classList.add('disconnected');
                voiceAction.title = "Join the room";
                voiceAction.innerHTML = `<revoice-icon-phone></revoice-icon-phone>`;
                voiceAction.onclick = () => this.join(this.#room.id);
                break;

            case VoiceCall.OPEN:
                document.getElementById(this.#activeRoom).classList.add('active-voice');
                voiceAction.className = "join";
                voiceAction.classList.add('connected');
                voiceAction.title = "Leave the room";
                voiceAction.innerHTML = `<revoice-icon-phone-x></revoice-icon-phone-x>`;
                voiceAction.onclick = () => this.leave();
                break;
        }
    }

    // Count user in room
    async usersCount(roomId) {
        const result = await this.#fetcher.fetchCore(`/room/${roomId}/user`, 'GET');
        if (result.connectedUser === null) {
            return 0;
        }
        return result.connectedUser.length;
    }

    // Update users counter
    async #updateUserCounter(roomId) {
        const count = await this.usersCount(roomId);
        const element = document.getElementById(`room-extension-${roomId}`);
        element.innerHTML = `${count}<revoice-icon-user></revoice-icon-user>`
    }

    // Add or remove controls on users in room
    async #updateJoinedUsers() {
        const result = await this.#fetcher.fetchCore(`/room/${this.#room.id}/user`, 'GET');

        if (result === null) {
            console.debug("VOICE : No user in room");
            return;
        }

        const connectedUser = result.connectedUser;

        for (const user of connectedUser) {
            const userId = user.id;

            this.#voiceCall.addUser(userId);

            // Not self
            if (this.#user.id !== userId) {
               this.#updateUserControls(userId);
            }
        }
    }
}

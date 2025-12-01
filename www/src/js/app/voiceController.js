import VoiceCall from "./voiceCall.js";
import StreamController from './streamController.js';

export default class VoiceController {
    #alert;
    #fetcher;
    #voiceURL;
    #mediaUrl
    #token;
    #voiceCall;
    #activeRoom;
    #user;
    #room;
    #contextMenu;
    #lastStateSelfMute = false;
    streamController;

    constructor(fetcher, alert, user, room, token, voiceURL, mediaUrl, streamUrl) {
        this.#fetcher = fetcher;
        this.#voiceURL = voiceURL;
        this.#token = token;
        this.#user = user;
        this.#alert = alert;
        this.#room = room;
        this.#mediaUrl = mediaUrl;
        this.streamController = new StreamController(fetcher, alert, user, room, token, streamUrl);
        this.#contextMenu = document.getElementById('voice-context-menu');
    }

    attachEvents() {
        document.getElementById("voice-self-mute").addEventListener('click', async () => await this.#toggleSelfMute());
        document.getElementById("voice-self-deaf").addEventListener('click', async () => await this.#toggleSelfDeaf());
        this.streamController.attachEvents();
    }

    getActiveRoom() {
        return this.#activeRoom;
    }

    // <user> call this to join a call in a room
    async join(roomId) {
        if (this.#activeRoom && this.#activeRoom != roomId) {
            await this.leave(this.#activeRoom);
        }

        this.#activeRoom = roomId;

        try {
            this.#voiceCall = new VoiceCall(this.#user);
            await this.#voiceCall.open(this.#voiceURL, roomId, this.#token, this.#setUserGlow, this.#setSelfGlow);

            // Update users in room
            await this.#updateJoinedUsers();

            // Update self
            this.updateSelf(this.#user.settings.voice);

            // Update counter
            this.#updateUserCounter(roomId);

            // Update context menu
            this.#contextMenu.setVoiceCall(this.#voiceCall);

            // Check for available stream
            this.streamController.availableStream(roomId);

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
        await this.#voiceCall.close();
        await this.streamController.stopAll();
        this.updateSelf();
        await this.#updateJoinedUsers();
        this.#updateUserCounter(this.#activeRoom);
        this.#activeRoom = null;

        // Update context menu
        this.#contextMenu.setVoiceCall(null);

        // Audio alert
        this.#alert.play('voiceDisconnected');
    }

    /**
     * <server.js> call this when a new user join the room
     * @param {VoiceJoiningNotification} data
     * @return {Promise<void>}
     */
    async userJoining(data) {
        this.#updateUserCounter(data.roomId);

        const userData = data.user;
        const voiceContent = document.getElementById(`voice-users-${data.roomId}`);
        voiceContent.appendChild(this.#createUserElement(userData));

        // NOT our room
        if (data.roomId !== this.#room.id) { return; }

        // User joining this is NOT self and current user is connected to voice room
        if (userData.id !== this.#user.id && this.#voiceCall && this.#voiceCall.getState() === VoiceCall.OPEN) {
            this.#updateUserControls(userData.id);
            this.#alert.play('voiceUserJoin');
        }
    }

    /**
     * <server.js> call this when a user leave the room
     * @param {VoiceLeavingNotification} data
     * @return {Promise<void>}
     */
    async userLeaving(data) {
        this.#updateUserCounter(data.roomId);

        const userId = data.user;

        // Remove user from UI
        const userElement = document.getElementById(`voice-${userId}`)
        if (userElement) {
            userElement.remove();
        }

        // NOT our room
        if (data.roomId !== this.#room.id) { return; }

        // User leaving is NOT self
        if (userId !== this.#user.id && this.#voiceCall && this.#voiceCall.getState() === VoiceCall.OPEN) {
            this.#voiceCall.removeUser(userId);
            this.#alert.play('voiceUserLeft');
        }
    }

    // Show users in a room
    async showJoinedUsers(roomId) {
        const result = await this.#fetcher.fetchCore(`/room/${roomId}/user`, 'GET');

        if (result.connectedUser === null) {
            console.debug("VOICE : No user in room");
            return;
        }

        const connectedUser = result.connectedUser;

        const sortedByDisplayName = [...connectedUser].sort((a, b) => {
            return a.user.displayName.localeCompare(b.user.displayName);
        });

        const voiceContent = document.getElementById(`voice-users-${roomId}`);
        voiceContent.innerHTML = "";

        for (const connectedUser of sortedByDisplayName) {
            voiceContent.appendChild(this.#createUserElement(connectedUser.user));
        }

        // Room is currently active
        if (this.#activeRoom === roomId) {
            this.#updateJoinedUsers();
        }
    }

    #setUserGlow(userId, enabled) {
        const gate = document.getElementById(`voice-gate-${userId}`);
        if (gate) {
            if (enabled) {
                gate.classList.add('active');
            }
            else {
                gate.classList.remove('active');
            }
        }
    }

    #setSelfGlow(enabled) {
        if (enabled) {
            document.getElementById(`voice-self-mute`).classList.add('green');
        }
        else {
            document.getElementById(`voice-self-mute`).classList.remove('green');
        }
    }

    // Create DOM Element / HTML for a given user
    #createUserElement(userData) {
        const userId = userData.id;
        const profilePicture = `${this.#mediaUrl}/profiles/${userId}`;

        const extension = document.createElement('div');
        extension.className = "extension";
        extension.id = `voice-user-extension-${userId}`;

        if (this.#user.settings.voice.users[userId]?.muted) {
            const userMuted = document.createElement("div");
            userMuted.innerHTML = "<revoice-icon-speaker-x></revoice-icon-speaker-x>";
            userMuted.className = "red";
            extension.appendChild(userMuted);
        }

        const DIV = document.createElement('div');
        DIV.id = `voice-${userId}`;
        DIV.className = "voice-profile";
        DIV.innerHTML = `
            <div class='block-user gate' id='voice-gate-${userId}'>
                <div class='relative'>
                    <img src='${profilePicture}' alt='PFP' class='icon' name='user-picture-${userId}'/>
                </div>
                <div class='user'>
                    <div class='name' name='user-name-${userId}'>${userData.displayName}</div>
                </div>
            </div>
        `;

        DIV.appendChild(extension);

        // Context menu
        if (userId !== this.#user.id) {
            DIV.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                this.#contextMenu.load(this.#user.settings, userId, this);
                this.#contextMenu.open(event.clientX, event.clientY);
            }, false);
        }
        else {
            DIV.addEventListener('contextmenu', (event) => { event.preventDefault(); }, false);
        }

        return DIV;
    }

    // <voiceUpdateJoinedUsers> and <voiceUserJoining> call this to update control on given user
    #updateUserControls(userId) {
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

                if (!this.#user.settings.voice.users[userId]) {
                    this.#user.settings.voice.users[userId] = { volume: 1, muted: false };
                }

                break;
            }
        }
    }

    updateUserExtension(userId) {
        const userExtension = document.getElementById(`voice-user-extension-${userId}`);
        if (userExtension) {
            userExtension.innerHTML = "";

            // User muted
            if (this.#user.settings.voice.users[userId]?.muted) {
                const userMuted = document.createElement("div");
                userMuted.name = "extension-mute";
                userMuted.innerHTML = "<revoice-icon-speaker-x></revoice-icon-speaker-x>";
                userMuted.className = "red";
                userExtension.appendChild(userMuted);
            }
        }
    }

    // <user> call this to mute himself
    async #toggleSelfMute() {
        if (this.#voiceCall) {
            await this.#voiceCall.toggleSelfMute();
            await this.#updateSelfMute(true);
            this.#saveSettings();
        }
    }

    async #updateSelfMute(alert = true) {
        const muteButton = document.getElementById("voice-self-mute");
        if (this.#voiceCall) {
            if (await this.#voiceCall.getSelfMute()) {
                // Muted
                muteButton.classList.add('red');
                if (alert) {
                    this.#alert.play('microphoneMuted');
                }
            }
            else {
                // Unmuted
                muteButton.classList.remove('red');
                if (alert) {
                    this.#alert.play('microphoneActivated');
                }
            }
        }
    }

    setSelfVolume() {
        if (this.#voiceCall) {
            this.#voiceCall.setSelfVolume(this.#user.settings.voice.self.volume);
        }
    }

    async #toggleSelfDeaf() {
        if (this.#voiceCall) {
            await this.#voiceCall.toggleSelfDeaf();
            if (await this.#voiceCall.getSelfDeaf()) {
                this.#lastStateSelfMute = await this.#voiceCall.getSelfMute();
                await this.#voiceCall.setSelfMute(true);
            } else {
                await this.#voiceCall.setSelfMute(this.#lastStateSelfMute);
            }
            await this.#updateSelfDeaf(true);
            await this.#updateSelfMute(false);
            this.#saveSettings();
        }
    }

    async #updateSelfDeaf(alert = true) {
        const button = document.getElementById("voice-self-deaf");
        if (this.#voiceCall) {
            if (await this.#voiceCall.getSelfDeaf()) {
                // Muted
                button.classList.add('red');
                if (alert) {
                    this.#alert.play('soundMuted');
                }
            }
            else {
                // Unmuted
                button.classList.remove('red');
                if (alert) {
                    this.#alert.play('soundActivated');
                }
            }
        }
    }

    setOutputVolume(value) {
        if (this.#voiceCall) {
            this.#voiceCall.setOutputVolume(value);
        }
    }

    #saveSettings() {
        if (this.#voiceCall) {
            this.#user.settings.voice = this.#voiceCall.getSettings();
        }

        this.#user.settings.save();
    }

    updateGate() {
        if (this.#voiceCall) {
            this.#voiceCall.setGate(this.#user.settings.voice.gate);
        }
    }

    // Update user controls and UI
    updateSelf(voiceSettings = null) {
        const voiceAction = document.getElementById("voice-join-action");
        const muteButton = document.getElementById("voice-self-mute");
        const deafButton = document.getElementById("voice-self-deaf");
        const webcamButton = document.getElementById("stream-webcam");
        const displayButton = document.getElementById("stream-display");
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
                if (this.#activeRoom) {
                    document.getElementById(this.#activeRoom).classList.remove('active-voice');
                }
                voiceAction.className = "join";
                voiceAction.classList.add('disconnected');
                voiceAction.title = "Join the room";
                voiceAction.innerHTML = `<revoice-icon-phone></revoice-icon-phone>`;
                voiceAction.onclick = () => this.join(this.#room.id);
                muteButton.classList.add('hidden');
                deafButton.classList.add('hidden');
                webcamButton.classList.add('hidden');
                displayButton.classList.add('hidden');
                break;

            case VoiceCall.OPEN:
                document.getElementById(this.#activeRoom).classList.add('active-voice');
                voiceAction.className = "join";
                voiceAction.classList.add('connected');
                voiceAction.title = "Leave the room";
                voiceAction.innerHTML = `<revoice-icon-phone-x></revoice-icon-phone-x>`;
                voiceAction.onclick = () => this.leave();
                muteButton.classList.remove('hidden');
                deafButton.classList.remove('hidden');
                webcamButton.classList.remove('hidden');
                displayButton.classList.remove('hidden');
                if (voiceSettings) {
                    if (voiceSettings.muted) {
                        muteButton.classList.add('red');
                    }
                    if (voiceSettings.deaf) {
                        deafButton.classList.add('red');
                    }
                }
                this.#updateSelfDeaf(false);
                this.#updateSelfMute(false);
                break;
        }
    }

    updateJoinButton(roomId) {
        if (!this.#activeRoom) {
            document.getElementById("voice-join-action").onclick = () => this.join(roomId);
        }
    }

    // Count user in room
    async usersCount(roomId) {
        const result = await this.#fetcher.fetchCore(`/room/${roomId}/user`, 'GET');
        return result.connectedUser ? result.connectedUser.length : 0;
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

        const connectedUsers = result.connectedUser;

        for (const connectedUser of connectedUsers) {
            const userId = connectedUser.id;

            // Not self
            if (this.#user.id !== userId) {
                this.#updateUserControls(userId);
                this.updateUserExtension(userId);
            }
        }
    }

    isCallActive() {
        return (this.#activeRoom ? true : false);
    }
}

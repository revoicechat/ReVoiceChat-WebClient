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
    #contextMenu
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
        this.streamController.stopAll();
        await this.#updateJoinedUsers();
        this.#updateUserCounter(this.#activeRoom);
        this.updateSelf();

        this.#activeRoom = null;

        // Update context menu
        this.#contextMenu.setVoiceCall(null);

        // Audio alert
        this.#alert.play('voiceDisconnected');
    }

    // <server.js> call this when a new user join the room
    async userJoining(data) {
        this.#updateUserCounter(data.roomId);

        if (data.roomId !== this.#room.id) { return; }

        const userData = data.user;
        const voiceContent = document.getElementById(`voice-users-${data.roomId}`);
        voiceContent.appendChild(this.#createUserElement(userData));

        // User joining this is NOT self and current user is connected to voice room
        if (userData.id !== this.#user.id && this.#voiceCall && this.#voiceCall.getState() === VoiceCall.OPEN) {
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
        const userElement = document.getElementById(`voice-${userId}`)
        if (userElement) {
            userElement.remove();
        }

        // User leaving is NOT self
        if (userId !== this.#user.id && this.#voiceCall && this.#voiceCall.getState() === VoiceCall.OPEN) {
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

        const voiceContent = document.getElementById(`voice-users-${this.#room.id}`);
        voiceContent.innerHTML = "";

        for (const user of sortedByDisplayName) {
            voiceContent.appendChild(this.#createUserElement(user));
        }

        // Room is currently active
        if (this.#activeRoom === this.#room.id) {
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
        const DIV = document.createElement('div');
        DIV.id = `voice-${userId}`;
        DIV.className = "voice-profile";

        const profilePicture = `${this.#mediaUrl}/profiles/${userId}`;

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

        if (userId !== this.#user.id) {
            DIV.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                this.#contextMenu.load(this.#user.settings, userId);
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

    // <user> call this to mute himself
    async #toggleSelfMute() {
        if (this.#voiceCall) {
            await this.#voiceCall.toggleSelfMute();
        }
        this.#updateSelfMute(true);
        this.#saveSettings();
    }

    #updateSelfMute(alert = true) {
        const muteButton = document.getElementById("voice-self-mute");
        if (this.#voiceCall) {
            if (this.#voiceCall.getSelfMute()) {
                // Muted
                muteButton.classList.add('active');
                if (alert) {
                    this.#alert.play('microphoneMuted');
                }
            }
            else {
                // Unmuted
                muteButton.classList.remove('active');
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
        }
        this.#updateSelfDeaf(true);
        this.#saveSettings();
    }

    #updateSelfDeaf(alert = true) {
        const button = document.getElementById("voice-self-deaf");
        const muteButton = document.getElementById("voice-self-mute");
        if (this.#voiceCall) {
            if (this.#voiceCall.getSelfDeaf()) {
                // Muted
                button.classList.add('active');
                this.#voiceCall.setSelfMute(true);
                muteButton.classList.add('active');
                if (alert) {
                    this.#alert.play('soundMuted');
                }
            }
            else {
                // Unmuted
                button.classList.remove('active');
                this.#voiceCall.setSelfMute(false);
                muteButton.classList.remove('active');
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
                document.getElementById(this.#room.id).classList.remove('active-voice');
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

            // Not self
            if (this.#user.id !== userId) {
                await this.#voiceCall.addUser(userId);
                this.#updateUserControls(userId);
            }
        }
    }

    isCallActive() {
        return (this.#activeRoom ? true : false);
    }
}

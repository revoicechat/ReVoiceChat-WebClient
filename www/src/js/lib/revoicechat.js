class ReVoiceChat {
    // URL
    coreUrl;
    mediaUrl;
    voiceUrl;

    constructor() {
        // Retrieve URL
        const storedCoreUrl = sessionStorage.getItem('url.core');
        if (!storedCoreUrl) {
            document.location.href = `index.html`;
        }

        // Validate URL
        const core = new URL(storedCoreUrl);

        // Store URL
        this.coreUrl = `${core.protocol}//${core.host}`;
        this.mediaUrl = `${core.protocol}//${core.host}/media`;
        this.voiceUrl = `${core.protocol}//${core.host}/api/voice`;

        // Store token
        this.#token = getCookie("jwtToken");

        // Restore State
        this.#restoreState();
    }

    saveState() {
        const state = {
            coreUrl: this.coreUrl,
            mediaUrl: this.mediaUrl,
            voiceUrl: this.voiceUrl,

            server: {
                id: null,
                name: null,
            },
            room: {
                id: null,
                name: null,
                type: null,
            },
            user: {
                id: null,
                displayName: null,
            },
            chat: {
                mode: "send",
                editId: null,
                emojisGlobal: [],
                attachmentMaxSize: 0,
            }
        }

        sessionStorage.setItem('lastState', JSON.stringify(state));
    }

    #restoreState() {
        const lastState = JSON.parse(sessionStorage.getItem('lastState'));
        if (lastState) {
            // URL
            this.coreUrl = lastState.coreUrl;
            this.mediaUrl = lastState.mediaUrl;
            this.voiceUrl = lastState.voiceUrl;
        }
    }

    // Token
    #token;

    getToken() {
        return this.#token;
    }

    // Server Send Event
    #sse;

    openSSE() {
        this.#sse = new EventSource(`${RVC.coreUrl}/api/sse?jwt=${RVC.getToken()}`);

        this.#sse.onmessage = (event) => {
            event = JSON.parse(event.data);
            const type = event.type;
            const data = event.data;

            console.debug("SSE : ", event);

            switch (type) {
                case "PING":
                    return;

                case "SERVER_UPDATE":
                    serverUpdate(data);
                    return;

                case "ROOM_UPDATE":
                    roomUpdate(data);
                    return;

                case "ROOM_MESSAGE":
                    roomMessage(data);
                    return;

                case "DIRECT_MESSAGE":
                    return;

                case "USER_STATUS_CHANGE":
                    return;

                case "USER_UPDATE":
                    userUpdate(data);
                    return;

                case "VOICE_JOINING":
                    voiceUserJoining(data);
                    return;

                case "VOICE_LEAVING":
                    voiceUserLeaving(data);
                    return;

                default:
                    console.error("SSE type unknowned: ", type);
                    return;
            }
        };

        this.#sse.onerror = () => {
            console.error(`An error occurred while attempting to connect to "${RVC.coreUrl}/api/sse".\nRetry in 10 seconds`);
            setTimeout(() => {
                sseOpen();
                getMessages(getGlobal().room.id);
            }, 10000);
        }
    }

    closeSSE() {
        if (this.#sse) {
            this.#sse.close();
            this.#sse = null;
        }
    }
}

class ReVoiceChatNotification {
    // Notifications
    #defaultSounds = {
        messageNew: 'src/audio/messageNew.ogg',
        voiceUserJoin: 'src/audio/userJoinMale.mp3',
        voiceUserLeft: 'src/audio/userLeftMale.mp3',
        voiceConnected: 'src/audio/userConnectedMale.mp3',
        voiceDisconnected: 'src/audio/userDisconnectedMale.mp3',
    }

    play(type) {
        if (!this.#defaultSounds[type]) {
            console.error('Notification type is null or undefined');
        }

        let audio = new Audio(this.#defaultSounds[type]);
        audio.volume = 0.25;
        audio.play();
    }
}
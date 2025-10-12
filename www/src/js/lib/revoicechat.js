class ReVoiceChat {
    notification = new ReVoiceChatNotification();
    router = new ReVoiceChatRouter();

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

        // Save state before page unload
        addEventListener("beforeunload", () => {
            this.#saveState();
            this.#closeSSE();
        })
    }

    #saveState() {
        const state = {
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
        this.#closeSSE();

        this.#sse = new EventSource(`${this.coreUrl}/api/sse?jwt=${this.#token}`);

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
            console.error(`An error occurred while attempting to connect to "${this.coreUrl}/api/sse".\nRetry in 10 seconds`);
            setTimeout(() => {
                this.openSSE();
                getMessages(getGlobal().room.id);
            }, 10000);
        }
    }

    #closeSSE() {
        if (this.#sse) {
            this.#sse.close();
            this.#sse = null;
        }
    }

    // Fetch
    async fetchCore(path, method = null, data = null) {
        if (method === null) {
            method = 'GET';
        }

        if (data) {
            data = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.coreUrl}/api${path}`, {
                method: method,
                signal: AbortSignal.timeout(5000),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.#token}`
                },
                body: data
            });

            if (method !== "DELETE") {
                const contentType = response.headers.get("content-type");

                if (contentType?.includes("application/json")) {
                    return await response.json();
                }
            }

            return response.ok;
        }
        catch (error) {
            console.error(`fetchCore: An error occurred while processing request \n${error}\nHost: ${this.coreUrl}\nPath: ${path}\nMethod: ${method}`);
            return null;
        }
    }

    async fetchMedia(path, method = null) {
        if (method === null) {
            method = 'GET';
        }

        try {
            const response = await fetch(`${this.coreUrl}/media${path}`, {
                method: method,
                signal: AbortSignal.timeout(5000),
                headers: {
                    'Authorization': `Bearer ${this.#token}`
                }
            });

            if (method !== "DELETE") {
                const contentType = response.headers.get("content-type");

                if (contentType?.includes("application/json")) {
                    return await response.json();
                }
            }

            return response.ok;
        }
        catch (error) {
            console.error(`fetchMedia: An error occurred while processing request \n${error}\nHost: ${this.coreUrl}\nPath: ${path}\nMethod: ${method}`);
            return null;
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

class ReVoiceChatRouter {
    routeTo(destination) {
        document.querySelectorAll('.main').forEach(element => { element.classList.add('hidden') });

        switch (destination) {
            case "setting":
                this.#pushState('setting');
                settingLoad();
                document.getElementById('route-setting').classList.remove('hidden');
                break;

            case "config":
                this.#pushState('config');
                configLoad()
                document.getElementById('route-config').classList.remove('hidden');
                break;

            case "app":
            default:
                this.#pushState('');
                document.getElementById('route-app').classList.remove('hidden');
                break;
        }
    }

    #pushState(destination) {
        const url = new URL(location);
        url.searchParams.delete('r');

        if (destination && destination !== "") {
            url.searchParams.set("r", destination);
        }

        history.pushState({}, "", url);
    }
}

class ReVoiceChatServer {
    #rvc;
    #id;
    #name;

    constructor(rvc) {
        this.#rvc = rvc;
        this.load();
    }

    getId() {
        return this.#id;
    }

    getName() {
        return this.#name;
    }

    async load() {
        const result = await this.#rvc.fetchCore("/server", 'GET');

        if (result === null) {
            return;
        }

        if (this.#id) {
            this.select(this.#id, this.#name);
        } else {
            const server = result[0]
            this.select(server.id, server.name);
        }
    }

    select(id, name) {
        if (!id || !name) {
            console.error("Server id or name is null or undefined");
            return;
        }

        this.#id = id;
        this.#name = name;
        document.getElementById("server-name").innerText = name;

        this.#getUsers(id);
        getRooms(id);
    }

    update(data) {
        switch (data.action) {
            case "MODIFY":
                getRooms(this.#id);
                return;

            default:
                return;
        }
    }

    async #getUsers(serverId) {
        const result = await this.#rvc.fetchCore(`/server/${serverId}/user`, 'GET');

        if (result !== null) {
            const sortedByDisplayName = [...result].sort((a, b) => {
                return a.displayName.localeCompare(b.displayName);
            });

            const sortedByStatus = [...sortedByDisplayName].sort((a, b) => {
                if (a.status === b.status) {
                    return 0;
                }
                else {
                    if (a.status === "OFFLINE") {
                        return 1;
                    }
                    if (b.status === "OFFLINE") {
                        return -1;
                    }
                }
            });

            const userList = document.getElementById("user-list");
            userList.innerHTML = "";

            for (const user of sortedByStatus) {
                userList.appendChild(await this.#createUser(user));
            }
        }
    }

    async #createUser(data) {
        const DIV = document.createElement('div');
        DIV.id = data.id;
        DIV.className = `${data.id} user-profile`
        const profilePicture = `${this.#rvc.mediaUrl}/profiles/${data.id}`;
        DIV.innerHTML = `
        <div class="relative">
            <img src="${profilePicture}" alt="PFP" class="icon ring-2" />
            <div id="dot-${data.id}" class="user-dot ${statusToDotClassName(data.status)}"></div>
        </div>
        <div class="user">
            <h2 class="name">${data.displayName}</h2>
        </div>
    `;

        return DIV;
    }
}

class ReVoiceChatUser {
    #rvc;
    #id;
    #displayName;

    constructor(rvc) {
        this.#rvc = rvc;
        this.#getUsername();
    }

    getDisplayName() {
        return this.#displayName;
    }

    getId() {
        return this.#id;
    }

    async #getUsername() {
        const result = await this.#rvc.fetchCore(`/user/me`, 'GET');

        if (result !== null) {
            this.#id = result.id;
            this.#displayName = result.displayName;

            document.getElementById("status-container").classList.add(result.id);
            document.getElementById("user-name").innerText = result.displayName;
            document.getElementById("user-status").innerText = result.status;
            document.getElementById("user-dot").className = `user-dot ${statusToDotClassName(result.status)}`;
            document.getElementById("user-picture").src = `${this.#rvc.mediaUrl}/profiles/${result.id}`;
        }
    }
}
class ReVoiceChat {
    notification = new Notification();
    router = new Router();
    user;
    room;
    server;

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

        // Instantiate other classes
        this.user = new User(this);
        this.room = new Room(this);
        this.server = new Server(this);

        // Save state before page unload
        addEventListener("beforeunload", () => {
            this.#saveState();
            this.#closeSSE();
        })
    }

    #saveState() {
        const state = {
            server: {
                id: this.server.id,
                name: this.server.name,
            },
            room: {
                id: this.room.id,
                name: this.room.name,
                type: this.room.type,
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

    restoreState() {
        const lastState = JSON.parse(sessionStorage.getItem('lastState'));
        if (lastState) {
            this.server.id = lastState.server.id;
            this.server.name = lastState.server.name;
            this.room.id = lastState.room.id;
            this.room.name = lastState.room.name;
            this.room.type = lastState.room.type;
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
                    this.server.update(data);
                    return;

                case "ROOM_UPDATE":
                    this.room.update(data);
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
                getMessages(RVC.room.id);
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

class Notification {
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

class Router {
    routeTo(destination) {
        for (const element of document.querySelectorAll('.main')) {
            element.classList.add('hidden');
        }

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

class User {
    #rvc;
    id;
    displayName;

    constructor(rvc) {
        this.#rvc = rvc;
        this.#load();
    }

    async #load() {
        const result = await this.#rvc.fetchCore(`/user/me`, 'GET');

        if (result !== null) {
            this.id = result.id;
            this.displayName = result.displayName;

            document.getElementById("status-container").classList.add(result.id);
            document.getElementById("user-name").innerText = result.displayName;
            document.getElementById("user-status").innerText = result.status;
            document.getElementById("user-dot").className = `user-dot ${statusToDotClassName(result.status)}`;
            document.getElementById("user-picture").src = `${this.#rvc.mediaUrl}/profiles/${result.id}`;
        }
    }

    saveSettings() {
        const settings = {
            voice: voice.settings,
        }

        localStorage.setItem('userSettings', JSON.stringify(settings));
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('userSettings'));

        const defaultVoice = VoiceCall.DEFAULT_SETTINGS;

        // Apply settings
        if (settings) {
            voice.settings.self = settings.voice.self ? settings.voice.self : defaultVoice.self;
            voice.settings.users = settings.voice.users ? settings.voice.users : {};
            voice.settings.compressor = settings.voice.compressor ? settings.voice.compressor : defaultVoice.compressor;
            voice.settings.gate = settings.voice.gate ? settings.voice.gate : defaultVoice.gate;
        }
        else {
            voice.settings = defaultVoice;
        }
    }
}

class Room {
    #rvc;
    id;
    name;
    type;

    constructor(rvc) {
        this.#rvc = rvc;
    }

    async load(serverId) {
        const roomResult = await this.#rvc.fetchCore(`/server/${serverId}/room`, 'GET');
        const structResult = await this.#rvc.fetchCore(`/server/${serverId}/structure`, 'GET');

        if (structResult?.items && roomResult) {
            const rooms = [];
            for (const room of roomResult) {
                rooms[room.id] = room;
            }

            const roomList = document.getElementById("sidebar-room-container");
            roomList.innerHTML = "";
            await this.#create(roomList, rooms, structResult.items);

            if (this.id) {
                this.#select(this.id, this.name, this.type);
            }
            else {
                const key = Object.keys(rooms)[0];
                const room = rooms[key];
                this.#select(room.id, room.name, room.type);
            }
        }
    }

    async #create(roomList, roomData, data) {
        for (const item of data) {
            if (item.type === 'CATEGORY') {
                roomList.appendChild(this.#roomCreateSeparator(item));
                await this.#create(roomList, roomData, item.items)
            }

            if (item.type === 'ROOM') {
                const elementData = roomData[item.id];

                if (this.id === null) {
                    this.id = elementData.id;
                    this.name = elementData.name;
                    this.type = elementData.type;
                }

                const roomElement = await this.#createElement(elementData);
                if (roomElement) {
                    roomList.appendChild(roomElement);
                }
            }
        }
    }

    #icon(type) {
        switch (type) {
            case "TEXT":
                return `<revoice-icon-chat-bubble></revoice-icon-chat-bubble>`;
            case "VOICE":
            case "WEBRTC":
                return `<revoice-icon-phone></revoice-icon-phone>`;
        }
    }

    async #createElement(data) {
        const DIV = document.createElement('div');

        if (data === undefined || data === null) {
            return;
        }

        const icon = this.#icon(data.type);

        DIV.id = data.id;
        DIV.className = "sidebar-room-element";
        DIV.onclick = () => this.#select(data.id, data.name, data.type);

        let extension = "";
        if (data.type === "VOICE") {
            DIV.ondblclick = () => { voiceJoin(data.id); }
            let userCount = await voiceUsersCount(data.id);
            extension = `${userCount}<revoice-icon-user></revoice-icon-user>`;
        }

        DIV.innerHTML = `
            <h3 class="room-title">
            ${icon}
            <div class="room-title-name">${data.name}</div>
            <div class="room-title-extension" id="room-extension-${data.id}">${extension}</div>
            </h3>
        `;

        return DIV;
    }

    #select(id, name, type) {
        if (!id || !name || !type) {
            console.error("ROOM : Can't select a room because data is null or undefined");
            return;
        }

        if (this.id && document.getElementById(this.id) !== undefined) {
            document.getElementById(this.id).classList.remove("active");
        }

        this.id = id;
        this.name = name;
        this.type = type;

        document.getElementById(this.id).classList.add("active");
        document.getElementById("room-name").innerText = this.name;

        switch (type) {
            case "TEXT":
                this.#selectText();
                break;
            case "WEBRTC":
                this.#selectWebRtc();
                break;
            case "VOICE":
                this.#selectVoice();
                break;
        }
    }

    #selectText() {
        document.getElementById("room-icon").innerHTML = `<revoice-icon-chat-bubble></revoice-icon-chat-bubble>`;

        document.getElementById("voice-container").classList.add('hidden');
        document.getElementById("text-container").classList.remove('hidden');

        document.getElementById("text-input").placeholder = `Send a message in ${this.name}`;
        document.getElementById("text-input").focus();

        getMessages(this.id);
    }

    #selectWebRtc() {
        console.info(`ROOM : Selected WebRTC room : ${this.id}`);
    }

    #selectVoice() {
        document.getElementById("room-icon").innerHTML = `<revoice-icon-phone></revoice-icon-phone>`;

        document.getElementById("text-container").classList.add('hidden');
        document.getElementById("voice-container").classList.remove('hidden');

        voiceUpdateSelf();
        voiceShowJoinedUsers(this.id);
    }

    #roomCreateSeparator(data) {
        const DIV = document.createElement('div');
        DIV.className = "sidebar-room-separator";
        DIV.innerHTML = `<h3 class="room-title">${data.name.toUpperCase()}</h3>`;
        return DIV;
    }

    update(data) {
        const room = data.room;

        if (!room && room.serverId !== this.#rvc.server.id) { return; }

        switch (data.action) {
            case "ADD":
            case "REMOVE":
                this.load(this.server.id);
                return;

            case "MODIFY":
                document.getElementById(room.id).children[0].innerHTML = `${roomIcon(room.type)} ${room.name}`;
                if (room.id === this.id) {
                    document.getElementById('room-name').innerText = room.name;
                }
                return;
        }
    }
}

class Server {
    #rvc;
    id;
    name;

    constructor(rvc) {
        this.#rvc = rvc;
        this.#load();
    }

    async #load() {
        const result = await this.#rvc.fetchCore("/server", 'GET');

        if (result === null) {
            return;
        }

        if (this.id) {
            this.select(this.id, this.name);
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

        this.id = id;
        this.name = name;
        document.getElementById("server-name").innerText = name;

        this.#usersLoad();
        this.#rvc.room.load(id);
    }

    update(data) {
        switch (data.action) {
            case "MODIFY":
                getRooms(this.id);
                return;

            default:
                return;
        }
    }

    async #usersLoad() {
        const result = await this.#rvc.fetchCore(`/server/${this.id}/user`, 'GET');

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

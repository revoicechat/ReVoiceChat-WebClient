class ReVoiceChat {
    alert = new Alert();
    router = new Router();
    fetcher;
    user;
    room;
    server;
    state;

    #token;
    #sse;
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
        this.fetcher = new Fetcher(this.#token, this.coreUrl, this.mediaUrl);
        this.user = new User(this.fetcher, this.mediaUrl);
        this.room = new Room(this.fetcher, this.alert, this.user, this.voiceUrl, this.#token);
        this.server = new Server(this.fetcher, this.mediaUrl, this.room);
        this.state = new State(this);

        // Save state before page unload
        addEventListener("beforeunload", () => {
            this.state.save();
            this.#closeSSE();
        })
    }

    // Token
    getToken() {
        return this.#token;
    }

    // Server Send Event
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
                    this.room.update(data, this.server.id);
                    return;

                case "ROOM_MESSAGE":
                    this.room.textController.processSSE(data);
                    return;

                case "DIRECT_MESSAGE":
                    return;

                case "USER_STATUS_CHANGE":
                    return;

                case "USER_UPDATE":
                    this.user.update(data);
                    return;

                case "VOICE_JOINING":
                    this.room.voiceController.userJoining(data);
                    return;

                case "VOICE_LEAVING":
                    this.room.voiceController.userLeaving(data);
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
                this.room.textController.getAllFrom(this.room.id);
            }, 10000);
        }
    }

    #closeSSE() {
        if (this.#sse) {
            this.#sse.close();
            this.#sse = null;
        }
    }

}

class Fetcher {
    #coreURL;
    #mediaURL;
    #token;

    constructor(token, coreURL, mediaURL) {
        this.#coreURL = coreURL;
        this.#mediaURL = mediaURL;
        this.#token = token;
    }

    async fetchCore(path, method = null, data = null) {
        if (method === null) {
            method = 'GET';
        }

        if (data) {
            data = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.#coreURL}/api${path}`, {
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
            console.error(`fetchCore: An error occurred while processing request \n${error}\nHost: ${this.#coreURL}\nPath: ${path}\nMethod: ${method}`);
            return null;
        }
    }

    async fetchMedia(path, method = null) {
        if (method === null) {
            method = 'GET';
        }

        try {
            const response = await fetch(`${this.#mediaURL}${path}`, {
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
            console.error(`fetchMedia: An error occurred while processing request \n${error}\nHost: ${this.#mediaURL}\nPath: ${path}\nMethod: ${method}`);
            return null;
        }
    }
}

class State {
    #rvc;

    constructor(rvc) {
        this.#rvc = rvc;
    }

    save() {
        const state = {
            server: {
                id: this.#rvc.server.id,
                name: this.#rvc.server.name,
            },
            room: {
                id: this.#rvc.room.id,
                name: this.#rvc.room.name,
                type: this.#rvc.room.type,
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

    load() {
        const lastState = JSON.parse(sessionStorage.getItem('lastState'));
        if (lastState) {
            this.#rvc.server.id = lastState.server.id;
            this.#rvc.server.name = lastState.server.name;
            this.#rvc.room.id = lastState.room.id;
            this.#rvc.room.name = lastState.room.name;
            this.#rvc.room.type = lastState.room.type;
        }
    }
}

class Alert {
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
    #fetcher;
    #mediaURL;
    id;
    displayName;
    voiceSettings = {
        compressor: {},
        gate: {},
        self: {},
        users: {},
    }

    constructor(fetcher, mediaURL) {
        this.#fetcher = fetcher;
        this.#mediaURL = mediaURL;
        this.#load();
    }

    async #load() {
        const result = await this.#fetcher.fetchCore(`/user/me`, 'GET');

        if (result !== null) {
            this.id = result.id;
            this.displayName = result.displayName;

            document.getElementById("status-container").classList.add(result.id);
            document.getElementById("user-name").innerText = result.displayName;
            document.getElementById("user-status").innerText = result.status;
            document.getElementById("user-dot").className = `user-dot ${statusToDotClassName(result.status)}`;
            document.getElementById("user-picture").src = `${this.#mediaURL}/profiles/${result.id}`;
        }
    }

    saveSettings() {
        const settings = {
            voice: this.voiceSettings,
        }

        localStorage.setItem('userSettings', JSON.stringify(settings));
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('userSettings'));

        const defaultVoice = VoiceCall.DEFAULT_SETTINGS;

        // Apply settings
        if (settings.voice) {
            this.voiceSettings.self = settings.voice.self ? settings.voice.self : defaultVoice.self;
            this.voiceSettings.users = settings.voice.users ? settings.voice.users : {};
            this.voiceSettings.compressor = settings.voice.compressor ? settings.voice.compressor : defaultVoice.compressor;
            this.voiceSettings.gate = settings.voice.gate ? settings.voice.gate : defaultVoice.gate;
        }
        else {
            this.voiceSettings = defaultVoice;
        }
    }

    update(data) {
        const id = data.id;
        for (const icon of document.querySelectorAll(`.${id} img.icon`)) {
            icon.src = `${this.#mediaURL}/profiles/${id}?t=${Date.now()}`;
        }
        for (const name of document.querySelectorAll(`.${id} .name`)) {
            name.innerText = data.displayName;
        }
    }
}

class Room {
    #fetcher;
    textController;
    voiceController;
    id;
    name;
    type;

    constructor(fetcher, alert, user, voiceURL, token) {
        this.#fetcher = fetcher;
        this.textController = new TextController(fetcher, alert, user, this);
        this.voiceController = new VoiceController(fetcher, voiceURL, token, user, alert, this);
    }

    async load(serverId) {
        const roomResult = await this.#fetcher.fetchCore(`/server/${serverId}/room`, 'GET');
        const structResult = await this.#fetcher.fetchCore(`/server/${serverId}/structure`, 'GET');

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
            DIV.ondblclick = () => { this.voiceController.join(data.id); }
            let userCount = await this.voiceController.usersCount(data.id);
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

        this.textController.getAllFrom(this.id);
    }

    #selectWebRtc() {
        console.info(`ROOM : Selected WebRTC room : ${this.id}`);
    }

    #selectVoice() {
        document.getElementById("room-icon").innerHTML = `<revoice-icon-phone></revoice-icon-phone>`;

        document.getElementById("text-container").classList.add('hidden');
        document.getElementById("voice-container").classList.remove('hidden');

        this.voiceController.updateSelf();
        this.voiceController.showJoinedUsers(this.id);
    }

    #roomCreateSeparator(data) {
        const DIV = document.createElement('div');
        DIV.className = "sidebar-room-separator";
        DIV.innerHTML = `<h3 class="room-title">${data.name.toUpperCase()}</h3>`;
        return DIV;
    }

    update(data, currentServerId) {
        const room = data.room;

        if (!room && room.serverId !== currentServerId) { return; }

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
    #fetcher;
    #mediaURL;
    #room;
    id;
    name;

    constructor(fetcher, mediaURL, room) {
        this.#fetcher = fetcher;
        this.#mediaURL = mediaURL;
        this.#room = room;
        this.#load();
    }

    async #load() {
        const result = await this.#fetcher.fetchCore("/server", 'GET');

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
        this.#room.load(id);
    }

    update(data) {
        switch (data.action) {
            case "MODIFY":
                this.#room.load(this.id);
                return;

            default:
                return;
        }
    }

    async #usersLoad() {
        const result = await this.#fetcher.fetchCore(`/server/${this.id}/user`, 'GET');

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
        const profilePicture = `${this.#mediaURL}/profiles/${data.id}`;
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

class TextController {
    #alert;
    #user;
    #fetcher;
    #room;
    mode = "send";
    #editId;
    #attachmentMaxSize = 0;
    emojisGlobal;

    constructor(fetcher, alert, user, room) {
        this.#fetcher = fetcher;
        this.#alert = alert;
        this.#user = user;
        this.#room = room;
        this.#getAttachmentMaxSize();
    }

    async getAllFrom(roomId) {
        const result = await this.#fetcher.fetchCore(`/room/${roomId}/message`, 'GET');

        if (result !== null) {
            const ROOM = document.getElementById("text-content");

            const sortedResult = [...result.content].sort((a, b) => {
                return new Date(a.createdDate) - new Date(b.createdDate);
            });

            ROOM.innerHTML = "";
            for (const message of sortedResult) {
                ROOM.appendChild(this.#create(message));
            }

            ROOM.scrollTop = ROOM.scrollHeight;
        }
    }

    processSSE(data) {
        if (data.action === "ADD" && this.#user.id != data.message.user.id) {
            this.#alert.play('messageNew');
        }

        if (data.message.roomId !== RVC.room.id) {
            return;
        }

        const message = data.message;
        const room = document.getElementById("text-content");
        switch (data.action) {
            case "ADD":
                room.appendChild(this.#create(message));
                break;
            case "MODIFY":
                document.getElementById(message.id).replaceWith(this.#createContent(message));
                break;
            case "REMOVE":
                document.getElementById(`container-${message.id}`).remove();
                break;
            default:
                console.error("Unsupported action : ", data.action);
                break;
        }

        room.scrollTop = room.scrollHeight;
    }

    joinAttachment() {
        const fileInput = document.getElementById("text-attachment");
        fileInput.click();
        document.getElementById("text-attachment-div").classList.remove('hidden');
    }

    removeAttachment() {
        const fileInput = document.getElementById("text-attachment");
        fileInput.value = "";
        document.getElementById("text-attachment-div").classList.add('hidden');
    }

    async send() {
        let result = null;
        let textInput = sanitizeString(document.getElementById('text-input').value);

        if (textInput == "" || textInput == null) {
            return;
        }

        const data = {
            text: textInput,
            medias: []
        }

        // Attachments
        const input = document.getElementById("text-attachment");
        const attachments = [];
        if (input && this.mode === "send") {
            for (const element of input.files) {
                if (element.size < this.#attachmentMaxSize) {
                    data.medias.push({ name: element.name });
                    attachments[element.name] = element;
                }
                else {
                    await Swal.fire({
                        icon: "error",
                        title: "File too big",
                        html: `"${element.name}" is too big<br/>Maximum size: ${humanFileSize(this.#attachmentMaxSize)}<br/>Your file: ${humanFileSize(element.size)}`,
                        animation: true,
                        customClass: {
                            title: "swalTitle",
                            popup: "swalPopup",
                            confirmButton: "swalConfirm",
                        },
                        showCancelButton: false,
                        focusConfirm: false,
                        confirmButtonText: "OK",
                    });
                    return;
                }
            }
        }

        switch (this.mode) {
            case "send":
                result = await this.#fetcher.fetchCore(`/room/${this.#room.id}/message`, 'PUT', data);
                break;

            case "edit":
                result = await this.#fetcher.fetchCore(`/message/${this.#editId}`, 'PATCH', data);
                break;

            default:
                console.error('Invalid mode');
                break;
        }

        if (result) {

            // Send attachements
            if (this.mode === "send") {
                for (const media of result.medias) {
                    const formData = new FormData();
                    formData.append("file", attachments[media.name]);
                    await fetch(`${RVC.mediaUrl}/attachments/${media.id}`, {
                        method: "POST",
                        signal: AbortSignal.timeout(5000),
                        headers: {
                            'Authorization': `Bearer ${RVC.getToken()}`
                        },
                        body: formData
                    });
                }
            }

            // Clean file input
            attachments.value = "";
            document.getElementById("text-attachment-div").classList.add('hidden');

            // Clean text input
            const textarea = document.getElementById("text-input");
            textarea.value = "";
            textarea.style.height = "auto";

            // Default mode
            this.mode = "send";
            this.#editId = null;
            return;
        }

        Swal.fire({
            icon: 'error',
            title: `Something went wrong`,
            text: "Error while sending message",
            animation: false,
            customClass: SwalCustomClass,
            showCancelButton: false,
            confirmButtonText: "OK",
            allowOutsideClick: false,
        });
    }

    oninput(input) {
        input.style.height = "auto";
        input.style.height = input.scrollHeight + "px";
        if (input.value == "") {
            this.mode = "send";
            this.#editId = null;
        }
    }

    #create(messageData) {
        const CONTAINER = document.createElement('div');
        CONTAINER.id = `container-${messageData.id}`;
        CONTAINER.className = "message-container";

        const HEADER = document.createElement('div');
        HEADER.className = "message-header";
        HEADER.innerHTML = `<h3 class="message-owner">${messageData.user.displayName} <span class="message-timestamp">${timestampToText(messageData.createdDate)}</span></h3>`;

        const CONTEXT_MENU = this.#createContextMenu(messageData)
        if (CONTEXT_MENU) {
            HEADER.appendChild(CONTEXT_MENU);
        }

        CONTAINER.appendChild(HEADER);

        CONTAINER.appendChild(this.#createContent(messageData));
        return CONTAINER;
    }

    #createContent(messageData) {
        const CONTENT = document.createElement('revoice-message');
        CONTENT.id = messageData.id;
        CONTENT.innerHTML = `
            <script type="application/json" slot="medias">
                ${JSON.stringify(messageData.medias)}
            </script>
            <script type="text/markdown" slot="content">
                ${messageData.text}
            </script>
            <script type="application/json" slot="emotes">
                ${JSON.stringify(messageData.emotes)}
            </script>
        `;
        return CONTENT;
    }

    async #edit(id) {
        const result = await this.#fetcher.fetchCore(`/message/${id}`, 'GET');

        if (result) {
            const textarea = document.getElementById("text-input");
            textarea.value = result.text;
            textarea.style.height = "auto";
            textarea.style.height = textarea.scrollHeight + "px";
            this.mode = "edit";
            this.#editId = id;
            document.getElementById("text-input").focus();
        }
    }

    async #delete(id) {
        await this.#fetcher.fetchCore(`/message/${id}`, 'DELETE');
    }

    #createContextMenu(messageData) {
        if (messageData.user.id != this.#user.id) {
            return null;
        }

        const DIV = document.createElement('div');
        DIV.className = "message-context-menu";

        const EDIT = document.createElement('div');
        EDIT.className = "icon";
        EDIT.innerHTML = "<revoice-icon-pencil></revoice-icon-pencil>";
        EDIT.onclick = () => this.#edit(messageData.id);

        const DELETE = document.createElement('div');
        DELETE.className = "icon";
        DELETE.innerHTML = "<revoice-icon-trash></revoice-icon-trash>";
        DELETE.onclick = () => this.#delete(messageData.id);

        DIV.appendChild(EDIT);
        DIV.appendChild(DELETE);

        return DIV
    }

    async #getAttachmentMaxSize() {
        const response = await this.#fetcher.fetchMedia('/maxfilesize');
        if (response) {
            this.#attachmentMaxSize = response.maxFileSize;
        }
    }
}

class VoiceController {
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
                INPUT_VOLUME.title = INPUT_VOLUME.value * 100 + "%";
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

        volumeInput.title = volume * 100 + "%";

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

    voiceUpdateGate() {
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

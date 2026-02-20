import TextController from './text.controller.js';
import VoiceController from './voice/voice.controller.js';
import CoreServer from "./core/core.server.js";

export default class Room {
    /** @type {TextController} */
    textController;
    /** @type {VoiceController} */
    voiceController;
    id;
    name;
    type;

    /**
     * @param {UserController} user
     */
    constructor(user) {
        this.textController = new TextController(user, this);
        this.voiceController = new VoiceController(user, this);
    }

    attachEvents(){
        this.textController.attachEvents();
        this.voiceController.attachEvents();
    }

    /**
     * @param {string} serverId
     * @return {Promise<void>}
     */
    async load(serverId) {
        await this.textController.getAttachmentMaxSize();

        /** @type {RoomRepresentation[]} */
        const roomResult = await CoreServer.fetch(`/server/${serverId}/room`, 'GET');
        /** @type {ServerStructure} */
        const structResult = await CoreServer.fetch(`/server/${serverId}/structure`, 'GET');

        if (structResult?.items && roomResult) {
            /** @type {Record<string, RoomRepresentation>} */
            const rooms = {};
            for (const room of roomResult) {
                rooms[room.id] = room;
            }

            const roomList = document.getElementById("rooms");
            roomList.innerHTML = "";
            await this.#create(roomList, rooms, structResult.items);

            if (rooms[this.id]) {
                this.#select(this.id, this.name, this.type);
            }
            else {
                const firstRoomId = this.#firstRoomInStructure(structResult.items);
                const room = rooms[firstRoomId];
                if (room) {
                    this.#select(room.id, room.name, room.type);
                }
            }
        }
    }

    #firstRoomInStructure(structure) {
        for (const item of structure) {
            if (item.type === 'CATEGORY') {
                return this.#firstRoomInStructure(item.items);
            }

            if (item.type === 'ROOM') {
                return item.id;
            }
        }
    }

    /**
     * @param {HTMLElement} roomList
     * @param {Record<string, RoomRepresentation>} roomData
     * @param {ServerItem[]} data
     * @return {Promise<void>}
     */
    async #create(roomList, roomData, data) {
        for (const item of data) {
            if (item.type === 'CATEGORY') {
                const category = /** @type {ServerCategory} */ (item)

                const DETAILS = document.createElement('details');
                DETAILS.open = true;
                const SUMMARY = document.createElement('summary');
                SUMMARY.innerText = category.name;
                DETAILS.appendChild(SUMMARY);
                await this.#create(DETAILS, roomData, category.items)
                roomList.appendChild(DETAILS);
            }

            if (item.type === 'ROOM') {
                const room = /** @type {ServerRoom} */ (item);
                const elementData = roomData[room.id];

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

    /**
     * @param {string} type
     * @return {string}
     */
    #icon(type) {
        switch (type) {
            case "TEXT":
                return `<revoice-icon-chat-bubble></revoice-icon-chat-bubble>`;
            case "VOICE":
            case "WEBRTC":
                return `<revoice-icon-phone></revoice-icon-phone>`;
        }
    }

    /**
     * @param {RoomRepresentation} room
     */
    async #createElement(room) {
        if (room === undefined || room === null) {
            return;
        }

        const root = document.createElement('div');

        const DIV = document.createElement('div');
        root.appendChild(DIV);

        DIV.id = room.id;
        DIV.className = "element";
        DIV.onclick = () => this.#select(room.id, room.name, room.type);

        const title = document.createElement('h3');
        title.className = "title";
        title.innerHTML = this.#icon(room.type);
        DIV.appendChild(title);

        const name = document.createElement('div');
        name.className = "title name";
        name.innerText = room.name;
        title.appendChild(name);

        const extension = document.createElement('div');
        extension.className = "title extension";
        extension.id = `room-extension-${room.id}`;
        title.appendChild(extension);


        if (room.type === "VOICE") {
            DIV.ondblclick = () => { this.voiceController.join(room.id); }
            let userCount = await this.voiceController.usersCount(room.id);
            extension.innerHTML = `${userCount}<revoice-icon-user></revoice-icon-user>`;

            const users = document.createElement('div');
            users.id = `voice-users-${room.id}`;
            users.className = "users";
            root.appendChild(users);

            void this.voiceController.showJoinedUsers(room.id, users);
        } else if (room.type === "TEXT") {
            DIV.ondblclick = async () => { await this.textController.load(room.id, true); }
            const notification = document.createElement('revoice-notification-dot')
            notification.id = `room-extension-dot-${room.id}`
            notification.style.margin = 'auto'
            if (!room.unreadMessages.hasUnreadMessage) {
                notification.className = 'hidden'
            }
            extension.appendChild(notification);
        }

        return root;
    }

    #select(id, name, type) {
        if (!id || !name || !type) {
            console.error("ROOM : Can't select a room because data is null or undefined");
            return;
        }

        const lastRoom = document.getElementById(this.id);
        if (this.id && lastRoom) {
            lastRoom.classList.remove("active");
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
        document.getElementById('sidebar-users').classList.remove('hidden');
        document.getElementById("room-icon").innerHTML = `<revoice-icon-chat-bubble></revoice-icon-chat-bubble>`;
        document.getElementById("voice-container").classList.add('hidden');
        document.getElementById("text-container").classList.remove('hidden');
        document.getElementById("text-input").placeholder = `Send a message in ${this.name}`;
        document.getElementById("text-input").focus();

        // Keep voice controls if voiceCall is active
        if (!this.voiceController.isCallActive()) {
            document.getElementById("voice-control-panel").classList.add('hidden');
        }

        void this.textController.load(this.id);
    }

    #selectWebRtc() {
        console.info(`ROOM : Selected WebRTC room : ${this.id}`);
    }

    #selectVoice() {
        document.getElementById('sidebar-users').classList.add('hidden');
        document.getElementById("room-icon").innerHTML = `<revoice-icon-phone></revoice-icon-phone>`;
        document.getElementById("text-container").classList.add('hidden');
        document.getElementById("voice-container").classList.remove('hidden');
        document.getElementById("voice-control-panel").classList.remove('hidden');

        this.voiceController.updateSelf(this.id);
        this.voiceController.updateJoinButton(this.id);
    }

    #roomCreateSeparator(data) {
        const DIV = document.createElement('div');
        DIV.className = "separator";
        DIV.innerHTML = `<h3 class="title">${data.name.toUpperCase()}</h3>`;
        return DIV;
    }

    /**
     * @param {RoomNotification} data
     * @param {string} currentServerId
     */
    update(data, currentServerId) {
        const room = data.room;

        if (!room && room.serverId !== currentServerId) { return; }

        switch (data.action) {
            case "ADD":
            case "REMOVE":
                this.load(currentServerId);
                return;

            case "MODIFY":
                document.getElementById(room.id).children[0].innerHTML = `${this.#icon(room.type)} ${room.name}`;
                if (room.id === this.id) {
                    document.getElementById('room-name').innerText = room.name;
                }
                return;
        }
    }
}
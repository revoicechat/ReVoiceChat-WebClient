import TextController from './textController.js';
import VoiceController  from './voiceController.js';

export default class Room {
    #fetcher;
    textController;
    voiceController;
    id;
    name;
    type;

    constructor(fetcher, alert, user, voiceUrl, token, mediaUrl, streamUrl) {
        this.#fetcher = fetcher;
        this.textController = new TextController(fetcher, alert, user, this);
        this.voiceController = new VoiceController(fetcher, alert, user, this, token, voiceUrl, mediaUrl, streamUrl);
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

    async #createElement(room) {
        if (room === undefined || room === null) {
            return;
        }

        const root = document.createElement('div');

        const DIV = document.createElement('div');
        root.appendChild(DIV);

        DIV.id = room.id;
        DIV.className = "sidebar-room element";
        DIV.onclick = () => this.#select(room.id, room.name, room.type);

        const title = document.createElement('h3');
        title.className = "room-title";
        title.innerHTML = this.#icon(room.type);
        DIV.appendChild(title);

        const name = document.createElement('div');
        name.className = "room-title-name";
        name.innerText = room.name;
        title.appendChild(name);

        const extension = document.createElement('div');
        extension.className = "room-title-extension";
        extension.id = `room-extension-${room.id}`;
        title.appendChild(extension);


        if (room.type === "VOICE") {
            DIV.ondblclick = () => { this.voiceController.join(room.id); }
            let userCount = await this.voiceController.usersCount(room.id);
            extension.innerHTML = `${userCount}<revoice-icon-user></revoice-icon-user>`;

            const users = document.createElement('div');
            users.id = `voice-users-${room.id}`;
            users.className = "sidebar-room users";
            root.appendChild(users);

            this.voiceController.showJoinedUsers(room.id);
        }

        return root;
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
        document.getElementById('sidebar-users').classList.remove('hidden');
        document.getElementById("room-icon").innerHTML = `<revoice-icon-chat-bubble></revoice-icon-chat-bubble>`;
        document.getElementById("voice-container").classList.add('hidden');
        document.getElementById("text-container").classList.remove('hidden');
        document.getElementById("text-input").placeholder = `Send a message in ${this.name}`;
        document.getElementById("text-input").focus();

        if(!this.voiceController.isCallActive()){
            document.getElementById("voice-control-panel").classList.add('hidden');
        }

        this.textController.getAllFrom(this.id);
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
        DIV.className = "sidebar-room separator";
        DIV.innerHTML = `<h3 class="room-title">${data.name.toUpperCase()}</h3>`;
        return DIV;
    }

    update(data, currentServerId) {
        const room = data.room;

        if (!room && room.serverId !== currentServerId) { return; }

        switch (data.action) {
            case "ADD":
            case "REMOVE":
                this.load(currentServerId);
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
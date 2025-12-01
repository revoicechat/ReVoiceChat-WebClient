export default class ServerSettingsController {
    #server;
    #fetcher;
    #currentTab;
    #mediaUrl;
    #popupData = {
        name: null,
        type: null
    };
    #structureData = { items: [] };
    #roomsData = [];
    #roomsNotRendered = [];
    #draggedElement = null;
    /** @type {string[]} */
    #flattenRisks = [];

    constructor(server, fetcher, mediaUrl) {
        this.#server = server;
        this.#fetcher = fetcher;
        this.#mediaUrl = mediaUrl;
    }

    load() {
        this.#loadRisks().then();
        this.#overviewLoad();
        this.#memberLoad().then();
    }

    riskModify() {
        this.#loadRisks(false);
    }

    async #loadRisks(select = true) {
        /** @type {UserRepresentation} */
        const me = await this.#fetcher.fetchCore(`/user/me`);
        const isAdmin = me.type === "ADMIN";
        /** @type {string[]} */
        const flattenRisks = await this.#fetcher.fetchCore(`/user/server/${this.#server.id}/risks`);

        this.#flattenRisks = flattenRisks;
        this.#selectEventHandler(flattenRisks, isAdmin);
        this.#attachEventsFromRisks(flattenRisks, isAdmin);

        if (select) {
            this.#select('overview');
        }
    }

    async #attachEventsFromRisks(flattenRisks, isAdmin) {
        this.#handleOverviewRisks(isAdmin, flattenRisks);
        this.#handleRoomRisks(isAdmin, flattenRisks);
        this.#handleRoleRisks(isAdmin, flattenRisks);
        this.#handleEmoteRisks(isAdmin, flattenRisks);
        this.#handleInvitationRisks(isAdmin, flattenRisks);
    }

    #handleInvitationRisks(isAdmin, flattenRisks) {
        const invitationRisks = new Set(['SERVER_INVITATION_ADD', 'SERVER_INVITATION_FETCH']);
        if (isAdmin || flattenRisks.some(elem => invitationRisks.has(elem))) {
            this.#invitationLoad().then();
            this.#invitationEventHandler();
        } else {
            this.#invitationEventHandler(true);
            if (this.#currentTab === "invitations") {
                this.#select('overview');
            }
        }
    }

    #handleEmoteRisks(isAdmin, flattenRisks) {
        const emoteRisks = new Set(['ADD_EMOTE', 'UPDATE_EMOTE', 'REMOVE_EMOTE']);
        if (isAdmin || flattenRisks.some(elem => emoteRisks.has(elem))) {
            this.#emotesLoad().then();
        } else if (this.#currentTab === "emotes") {
            this.#select('overview');
        }
    }

    #handleRoleRisks(isAdmin, flattenRisks) {
        const rolesRisks = new Set(['ADD_ROLE', 'UPDATE_ROLE', 'ADD_USER_ROLE']);
        if (isAdmin || flattenRisks.some(elem => rolesRisks.has(elem))) {
            this.#rolesLoad();
        } else {
            this.#rolesLoad(true);
            if (this.#currentTab === "roles") {
                this.#select('overview');
            }
        }
    }

    #handleRoomRisks(isAdmin, flattenRisks) {
        const roomRisks = new Set(['SERVER_ROOM_UPDATE', 'SERVER_ROOM_DELETE']);
        if (isAdmin || flattenRisks.some(elem => roomRisks.has(elem))) {
            this.#structureLoad().then();
            this.#roomLoad().then();
            this.#roomEventHandler();
        } else {
            this.#roomEventHandler(true);
            if (this.#currentTab === "rooms") {
                this.#select('overview');
            }
        }
    }

    #handleOverviewRisks(isAdmin, flattenRisks) {
        const overviewRisks = new Set(['SERVER_UPDATE']);
        if (isAdmin || flattenRisks.some(elem => overviewRisks.has(elem))) {
            this.#overviewEventHandler();
        } else {
            this.#overviewEventHandler(true);
        }
    }

    #select(name) {
        if (this.#currentTab) {
            document.getElementById(`server-setting-tab-${this.#currentTab}`).classList.remove("active");
            document.getElementById(`server-setting-content-${this.#currentTab}`).classList.add("hidden");
        }

        this.#currentTab = name;
        document.getElementById(`server-setting-tab-${this.#currentTab}`).classList.add('active');
        document.getElementById(`server-setting-content-${this.#currentTab}`).classList.remove('hidden');
    }

    #selectEventHandler(flattenRisks, isAdmin) {
        const parameters = [
            { button: 'overview', risks: null },
            { button: 'rooms', risks: ['SERVER_ROOM_UPDATE', 'SERVER_ROOM_DELETE'] },
            { button: 'roles', risks: ['UPDATE_ROLE', 'ADD_USER_ROLE', 'ADD_ROLE'] },
            { button: 'emotes', risks: ['UPDATE_EMOTE', 'REMOVE_EMOTE', 'ADD_EMOTE'] },
            { button: 'members', risks: null },
            { button: 'invitations', risks: ['SERVER_INVITATION_ADD', 'SERVER_INVITATION_FETCH'] }
        ]

        for (const param of parameters) {
            const button = document.getElementById(`server-setting-tab-${param.button}`);

            if (isAdmin || param.risks) {
                if (isAdmin || flattenRisks.some(elem => param.risks.includes(elem))) {
                    button.classList.remove('hidden');
                    button.onclick = () => this.#select(param.button);
                }
                else {
                    button.classList.add('hidden');
                    button.onclick = null;
                }
            } else {
                button.classList.remove('hidden');
                button.onclick = () => this.#select(param.button);
            }
        }
    }

    // OVERVIEW
    #overviewLoad() {
        document.getElementById('server-setting-overview-uuid').innerText = this.#server.id;
        document.getElementById('server-setting-overview-name').innerText = this.#server.name;
        document.getElementById('server-setting-overview-name-input').value = this.#server.name;
    }

    #overviewEventHandler(remove) {
        if (remove) {
            document.getElementById('server-setting-overview-name').classList.remove('hidden');
            document.getElementById('server-setting-overview-name-input').classList.add('hidden');
            const button = document.getElementById(`server-setting-overview-save`);
            button.classList.add('hidden');
            button.onclick = null;
        }
        else {
            document.getElementById('server-setting-overview-name').classList.add('hidden');
            document.getElementById('server-setting-overview-name-input').classList.remove('hidden');
            const button = document.getElementById(`server-setting-overview-save`);
            button.classList.remove('hidden');
            button.onclick = () => this.#overviewSave();
        }
    }

    async #overviewSave() {
        const spinner = new SpinnerOnButton("server-setting-overview-save")
        spinner.run()
        await this.#nameUpdate()
        spinner.success()
    }

    async #nameUpdate() {
        const serverName = document.getElementById("server-setting-overview-name-input").value;

        if (!serverName) {
            spinner.error();
            Swal.fire({
                icon: 'error',
                title: i18n.translateOne("server.settings.name.error"),
                animation: false,
                customClass: SwalCustomClass,
                showCancelButton: false,
                confirmButtonText: "OK",
                allowOutsideClick: false,
            });
            return;
        }

        /** @type {ServerRepresentation} */
        const result = await this.#fetcher.fetchCore(`/server/${this.#server.id}`, 'PATCH', { name: serverName })
        if (result) {
            this.#server.name = result.name;
            this.#overviewLoad();
        }
    }

    // ROOMS AND STRUCTURE
    #roomEventHandler(remove) {
        if (remove) {
            document.getElementById(`server-setting-structure-save`).onclick = null;
            document.getElementById(`server-setting-room-add`).onclick = null;
            document.getElementById(`server-setting-category-add`).onclick = null;
        }
        else {
            document.getElementById(`server-setting-structure-save`).onclick = () => this.#structureSave();
            document.getElementById(`server-setting-room-add`).onclick = () => this.#roomAdd();
            document.getElementById(`server-setting-category-add`).onclick = () => this.#categoryAdd();
        }
    }

    async #roomLoad() {
        /** @type {RoomRepresentation[]} */
        const roomResult = await this.#fetcher.fetchCore(`/server/${this.#server.id}/room`, 'GET');
        if (roomResult) {
            this.#roomsData = {};
            for (const room of roomResult) {
                this.#roomsData[room.id] = room;
            }
            this.#render();
        }
    }

    async #structureLoad() {
        /** @type {ServerStructure} */
        const struct = await this.#fetcher.fetchCore(`/server/${this.#server.id}/structure`, 'GET');
        if (struct) {
            this.#structureData = struct;
            this.#render();
        }
    }

    async #roomAdd() {
        this.#popupData.name = 'New room';
        this.#popupData.type = 'TEXT';

        Swal.fire({
            title: i18n.translateOne("server.structure.room.add"),
            animation: false,
            customClass: SwalCustomClass,
            showCancelButton: true,
            focusConfirm: false,
            confirmButtonText: "Add",
            allowOutsideClick: false,
            html: `
            <form id="popup-new-room" class='popup'>
                <label data-i18n="server.structure.room.name">Room name</label>
                <input type='text' id='popup-name'>
                <br/>
                <br/>
                <label data-i18n="server.structure.room.type">Room type</label>
                <select id='popup-type'>
                    <option value='TEXT' data-i18n="server.structure.room.type.text">Text</option>
                    <option value='VOICE' data-i18n="server.structure.room.type.voice">Voice (Built-in)</option>
                </select>
            </form>`,
            didOpen: () => {
                document.getElementById('popup-name').oninput = () => { this.#popupData.name = document.getElementById('popup-name').value };
                document.getElementById('popup-type').oninput = () => { this.#popupData.type = document.getElementById('popup-type').value };
                i18n.translatePage(document.getElementById("popup-new-room"))
            }
        }).then(async (result) => {
            if (result.value) {
                await this.#fetcher.fetchCore(`/server/${this.#server.id}/room`, 'PUT', this.#popupData);
                await this.#roomLoad();
            }
        });
    }

    async #roomEdit(item) {
        const data = this.#roomsData[item.id];
        this.#popupData.name = data.name;

        Swal.fire({
            title: i18n.translateOne("server.structure.room.edit", [data.name]),
            animation: false,
            customClass: SwalCustomClass,
            showCancelButton: true,
            focusConfirm: false,
            confirmButtonText: "Edit",
            allowOutsideClick: false,
            html: `
            <form id="popup-new-room" class='popup'>
                <label data-i18n="server.structure.room.name">Room name</label>
                <input type='text' id='popup-name' value='${data.name}'>
            </form>`,
            didOpen: () => {
                document.getElementById('popup-name').oninput = () => { this.#popupData.name = document.getElementById('popup-name').value };
                i18n.translatePage(document.getElementById("popup-new-room"))
            }
        }).then(async (result) => {
            if (result.value) {
                await this.#fetcher.fetchCore(`/room/${data.id}`, 'PATCH', this.#popupData);
                await this.#roomLoad();
            }
        });
    }

    async #roomDelete(item) {
        const data = this.#roomsData[item.id];
        Swal.fire({
            title: i18n.translateOne("server.structure.room.delete.title", [data.name]),
            animation: false,
            customClass: {
                title: "swalTitle",
                popup: "swalPopup",
                cancelButton: "swalConfirm",
                confirmButton: "swalCancel", // Swapped on purpose !
            },
            showCancelButton: true,
            focusCancel: true,
            confirmButtonText: i18n.translateOne("server.structure.room.delete"),
            allowOutsideClick: false,
        }).then(async (result) => {
            if (result.value) {
                await this.#fetcher.fetchCore(`/room/${data.id}`, 'DELETE');
                await this.#roomLoad();
            }
        });
    }

    #categoryAdd(parentItems = null) {
        const newCategory = {
            type: "CATEGORY",
            name: "New category",
            items: []
        };

        if (parentItems) {
            parentItems.push(newCategory);
        } else {
            this.#structureData.items.push(newCategory);
        }

        this.#render();
    }

    #categoryEdit(item) {
        this.#popupData.name = item.name;

        Swal.fire({
            title: i18n.translateOne("server.structure.category.edit", [item.name]),
            animation: false,
            customClass: SwalCustomClass,
            showCancelButton: true,
            focusConfirm: false,
            confirmButtonText: "Edit",
            allowOutsideClick: false,
            html: `
            <form id="popup-new-category" class='popup'>
                <label data-i18n="server.structure.category.name">Category name</label>
                <input type='text' id='popup-name' value='${item.name}'>
            </form>`,
            didOpen: () => {
                document.getElementById('popup-name').oninput = () => { this.#popupData.name = document.getElementById('popup-name').value };
                i18n.translatePage(document.getElementById("popup-new-category"))
            }
        }).then(async (result) => {
            if (result.value) {
                item.name = this.#popupData.name;
                this.#render();
            }
        });
    }

    #categoryDelete(item, parentItems) {
        Swal.fire({
            title: i18n.translateOne("server.structure.category.delete", [item.name]),
            animation: false,
            customClass: {
                title: "swalTitle",
                popup: "swalPopup",
                cancelButton: "swalConfirm",
                confirmButton: "swalCancel", // Swapped on purpose !
            },
            showCancelButton: true,
            focusCancel: true,
            confirmButtonText: i18n.translateOne("server.structure.category.delete.confirm"),
            allowOutsideClick: false,
        }).then(async (result) => {
            if (result.value) {
                const index = parentItems.indexOf(item);
                if (index > -1) {
                    parentItems.splice(index, 1);
                }
                this.#render();
            }
        });
    }

    async #structureSave() {
        const spinner = new SpinnerOnButton("server-setting-structure-save")
        spinner.run()
        this.#structureClean(this.#structureData.items);

        try {
            await this.#fetcher.fetchCore(`/server/${this.#server.id}/structure`, 'PATCH', this.#structureData);
            spinner.success()
        }
        catch (error) {
            spinner.error();
            Swal.fire({
                icon: 'error',
                title: `Updating structure failed`,
                text: error,
                animation: false,
                customClass: SwalCustomClass,
                showCancelButton: false,
                confirmButtonText: "OK",
                allowOutsideClick: false,
            });
        }
    }

    #structureClean(parent) {
        if (!parent) {
            return;
        }

        for (const item of parent) {
            if (item.type === 'CATEGORY') {
                this.#structureClean(item.items);
            }
            if (item.type === 'ROOM') {
                if (this.#roomsData[item.id] === undefined) {
                    const index = parent.indexOf(item);
                    if (index > -1) {
                        parent.splice(index, 1);
                    }
                }
            }
        }
    }

    #handleDragStart(e, item) {
        if (!this.#draggedElement) {
            this.#draggedElement = {
                item: item,
                sourceParent: this.#findParent(item)
            };
            e.target.classList.add('dragging');
            const dropZones = document.querySelectorAll('.server-structure-drop-zone');
            for (const dropZone of dropZones) {
                dropZone.classList.add('active');
            }
        }
    }

    #handleDragEnd(e) {
        e.target.classList.remove('dragging');
        const dropZones = document.querySelectorAll('.server-structure-drop-zone');
        for (const dropZone of dropZones) {
            dropZone.classList.remove('active');
        }
    }

    #handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    #handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    #handleDrop(e, targetParentItems, position) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        if (!this.#draggedElement) return;

        const { item, sourceParent } = this.#draggedElement;

        // Supprimer de la source
        if (sourceParent) {
            const sourceIndex = sourceParent.indexOf(item);
            if (sourceIndex > -1) {
                if (targetParentItems === sourceParent) {
                    position -= 1
                }
                sourceParent.splice(sourceIndex, 1);
            }
        }

        // Ajouter à la destination
        targetParentItems.splice(position, 0, item);
        this.#draggedElement = null;
        this.#render();
    }

    #findParent(targetItem, items = this.#structureData.items) {
        for (let item of items) {
            if (item === targetItem) {
                return this.#structureData.items;
            }
            if (item.type === 'CATEGORY' && item.items) {
                if (item.items.includes(targetItem)) {
                    return item.items;
                }
                const found = this.#findParent(targetItem, item.items);
                if (found) return found;
            }
        }
        return null;
    }

    #renderItem(item, parentItems, level = 0) {
        const itemDiv = document.createElement('div');
        itemDiv.className = `server-structure-tree-item server-structure-${item.type.toLowerCase()}`;
        itemDiv.draggable = true;

        itemDiv.addEventListener('dragstart', (e) => this.#handleDragStart(e, item));
        itemDiv.addEventListener('dragend', this.#handleDragEnd);

        const headerDiv = document.createElement('div');
        headerDiv.className = 'server-structure-item-header';

        const updateHidden = this.#flattenRisks.includes('SERVER_ROOM_UPDATE') ? "" : "hidden";
        const deleteHidden = this.#flattenRisks.includes('SERVER_ROOM_DELETE') ? "" : "hidden";

        switch (item.type) {
            case 'ROOM': {
                // Remove room being rendered from list of not render
                this.#roomsNotRendered = this.#roomsNotRendered.filter((id) => id !== item.id);

                const room = this.#roomsData[item.id];
                if (room === null || room === undefined) {
                    return null;
                }

                const icon = room.type === 'TEXT'
                    ? '<revoice-icon-chat-bubble class="size-small" ></revoice-icon-chat-bubble>'
                    : '<revoice-icon-phone class="size-small"></revoice-icon-phone>';
                headerDiv.innerHTML = `
                <span class="server-structure-item-icon">${icon}</span>
                <div class="server-structure-item-content">
                    <span class="server-structure-item-name">${room.name}</span>
                    <span class="server-structure-item-id">${room.id}</span>
                </div>
                <div class="server-structure-item-actions">
                    <button class="server-structure-btn btn-edit ${updateHidden}" data-item='${JSON.stringify(item)}'><revoice-icon-pencil class="size-smaller"></revoice-icon-pencil></button>
                    <button class="server-structure-btn btn-delete ${deleteHidden}" data-item='${JSON.stringify(item)}' data-parent='${JSON.stringify(parentItems)}'><revoice-icon-trash class="size-smaller"></revoice-icon-trash></button>
                </div>`;
                break;
            }
            case 'CATEGORY':
                headerDiv.innerHTML = `
                <span class="server-structure-item-icon"><revoice-icon-folder class="size-small"></revoice-icon-folder></span>
                <div class="server-structure-item-content">
                    <span class="server-structure-item-name">${item.name}</span>
                </div>
                <div class="server-structure-item-actions">
                    <button class="server-structure-btn btn-edit" data-item='${JSON.stringify(item)}'><revoice-icon-pencil class="size-smaller"></revoice-icon-pencil></button>
                    <button class="server-structure-btn btn-delete" data-item='${JSON.stringify(item)}' data-parent='${JSON.stringify(parentItems)}'><revoice-icon-trash class="size-smaller"></revoice-icon-trash></button>
                    <button class="server-structure-btn btn-add" onclick="event.stopPropagation(); categoryAdd(arguments[0].items)"><revoice-icon-folder-plus class="size-smaller"></revoice-icon-folder-plus></button>
                </div>`;
                break;
            default:
                console.error("renderItem : Unsupported item type");
                return;
        }

        const editBtn = headerDiv.querySelector('.btn-edit');
        const deleteBtn = headerDiv.querySelector('.btn-delete');

        editBtn.onclick = (e) => {
            e.stopPropagation();
            switch (item.type) {
                case 'ROOM':
                    this.#roomEdit(item);
                    break;
                case 'CATEGORY':
                    this.#categoryEdit(item);
                    break;
            }
        };

        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            switch (item.type) {
                case 'ROOM':
                    this.#roomDelete(item);
                    break;
                case 'CATEGORY':
                    this.#categoryDelete(item, parentItems);
                    break;
            }
        };

        if (item.type === 'CATEGORY') {
            const categoryAddBtn = headerDiv.querySelector('.btn-add');
            categoryAddBtn.onclick = (e) => {
                e.stopPropagation();
                this.#categoryAdd(item.items);
            };
        }

        itemDiv.appendChild(headerDiv);

        if (item.type === 'CATEGORY' && item.items && item.items.length > 0) {
            const childrenDiv = document.createElement('div');
            childrenDiv.className = 'server-structure-item-children';
            childrenDiv.appendChild(this.#renderDropZone(item, 0));
            let posSubCategory = 1
            for (const childItem of item.items) {
                const renderedItem = this.#renderItem(childItem, item.items, level + 1)
                if (renderedItem) {
                    childrenDiv.appendChild(renderedItem);
                }
                childrenDiv.appendChild(this.#renderDropZone(item, posSubCategory++));
            }

            itemDiv.appendChild(childrenDiv);
        } else if (item.type === 'CATEGORY') {
            // Catégorie vide
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'server-structure-item-children';
            emptyDiv.appendChild(this.#renderDropZone(item, 0));
            itemDiv.appendChild(emptyDiv);
        }

        return itemDiv;
    }

    #renderDropZone(item, position, classNames = "") {
        const dropZone = document.createElement('div');
        dropZone.className = 'server-structure-drop-zone ' + classNames;
        dropZone.addEventListener('dragover', this.#handleDragOver);
        dropZone.addEventListener('dragleave', this.#handleDragLeave);
        dropZone.addEventListener('drop', (e) => this.#handleDrop(e, item.items, position));
        return dropZone;
    }

    #render() {
        const container = document.getElementById('treeContainer');
        // Clear existing items but keep root drop zone
        const existingItems = container.querySelectorAll('.server-structure-tree-item, .server-root-zone');
        for (const item of existingItems) {
            item.remove();
        }

        // Setup root drop zone
        const rootDropZone = document.getElementById('rootDropZone');
        rootDropZone.addEventListener('dragover', this.#handleDragOver);
        rootDropZone.addEventListener('dragleave', this.#handleDragLeave);
        rootDropZone.addEventListener('drop', (e) => this.#handleDrop(e, this.#structureData.items, 0));

        // Build items list from this.#roomsData 
        for (const key in this.#roomsData) {
            this.#roomsNotRendered.push(key);
        }

        // Render all items in structure
        let posMain = 1
        for (const item of this.#structureData.items) {
            const renderedItem = this.#renderItem(item, this.#structureData.items)
            if (renderedItem) {
                container.appendChild(renderedItem);
            }
            container.appendChild(this.#renderDropZone(this.#structureData, posMain++, "server-root-zone"));
        }

        // Render remaining rooms
        for (const room of this.#roomsNotRendered) {
            container.appendChild(this.#renderItem({ id: room, type: 'ROOM' }, null));
        }
    }

    // ROLES
    #rolesLoad() {
        document.getElementById("server-setting-roles-component").setAttribute("server-id", this.#server.id)
    }

    // EMOTES
    async #emotesLoad() {
        /** @type {EmoteRepresentation[]} */
        const response = await this.#fetcher.fetchCore(`/emote/server/${this.#server.id}`);

        const old_manager = document.getElementById("server-setting-emotes-form");
        if (old_manager) {
            document.getElementById('server-setting-content-emotes').removeChild(old_manager);
        }

        const emoji_manager = document.createElement('revoice-emoji-manager');
        emoji_manager.setAttribute('path', `server/${this.#server.id}`);
        emoji_manager.id = "server-setting-emotes-form";
        emoji_manager.innerHTML = `<script type="application/json" slot="emojis-data">${JSON.stringify(response)}</script>`;
        document.getElementById("server-setting-content-emotes").appendChild(emoji_manager);
    }

    // MEMBERS
    async #memberLoad() {
        /** @type {UserRepresentation[]} */
        const result = await this.#fetcher.fetchCore(`/server/${this.#server.id}/user`, 'GET');

        if (result) {
            const sortedByDisplayName = [...result].sort((a, b) => {
                return a.displayName.localeCompare(b.displayName);
            });

            if (sortedByDisplayName !== null) {
                const userList = document.getElementById("server-setting-members");
                userList.innerHTML = "";
                for (const user of sortedByDisplayName) {
                    userList.appendChild(this.#memberItem(user));
                }
            }
        }
    }

    #memberItem(data) {
        const DIV = document.createElement('div');
        DIV.id = data.id;
        DIV.className = `${data.id} config-item`;

        const profilePicture = `${this.#mediaUrl}/profiles/${data.id}`;

        DIV.innerHTML = `
            <div class="relative">
                <img src="${profilePicture}" alt="PFP" class="icon ring-2" />
            </div>
            <div class="user">
                <div class="name" id="user-name">${data.displayName}<div>
            </div>
        `;

        return DIV;
    }

    // INVITATION
    #invitationEventHandler(remove) {
        if (remove) {
            document.getElementById('server-setting-invitation-create').onclick = null;
        }
        else {
            document.getElementById('server-setting-invitation-create').onclick = () => this.#invitationCreate();
        }
    }

    async #invitationLoad() {
        const serverId = this.#server.id;
        /** @type {InvitationRepresentation[]} */
        const result = await this.#fetcher.fetchCore(`/invitation/server/${serverId}`, 'GET');

        if (result) {
            const list = document.getElementById("server-setting-invitation");
            list.innerHTML = "";

            for (const invitation of result) {
                if (invitation.status === 'CREATED') {
                    list.appendChild(this.#invitationCreateItem(invitation));
                }
            }
        }
    }

    async #invitationCreate() {
        const serverId = this.#server.id;
        /** @type {InvitationRepresentation} */
        const result = await this.#fetcher.fetchCore(`/invitation/server/${serverId}`, 'POST');
        if (result.status === "CREATED") {
            this.#invitationLoad();
            Swal.fire({
                title: `New invitation`,
                html: `<input class='swal-input' type='text' value='${result.id}' readonly>`,
                animation: false,
                customClass: SwalCustomClass,
                showCancelButton: false,
                confirmButtonText: "OK",
                allowOutsideClick: false,
            })
        }
    }

    #invitationCreateItem(data) {
        const DIV = document.createElement('div');
        DIV.id = data.id;
        DIV.className = "config-item";

        // Name
        const DIV_NAME = document.createElement('div');
        DIV_NAME.className = "name invitation";
        DIV_NAME.innerText = `${data.id}`;
        DIV.appendChild(DIV_NAME);

        // Context menu
        const DIV_CM = document.createElement('div');
        DIV_CM.className = "context-menu";
        DIV_CM.appendChild(this.#createContextMenuButton("icon", "<revoice-icon-clipboard></revoice-icon-clipboard>", () => this.#invitationCopy(data.id)));
        DIV_CM.appendChild(this.#createContextMenuButton("icon", "<revoice-icon-trash></revoice-icon-trash>", () => this.#invitationDelete(data)));
        DIV.appendChild(DIV_CM);

        return DIV;
    }

    #invitationDelete(data) {
        Swal.fire({
            title: `Delete invitation '${data.id}'`,
            animation: false,
            customClass: {
                title: "swalTitle",
                popup: "swalPopup",
                cancelButton: "swalConfirm",
                confirmButton: "swalCancel", // Swapped on purpose !
            },
            showCancelButton: true,
            focusCancel: true,
            confirmButtonText: "Delete",
            allowOutsideClick: false,
        }).then(async (result) => {
            if (result.value) {
                await this.#fetcher.fetchCore(`/invitation/${data.id}`, 'DELETE');
                this.#invitationLoad();
            }
        });
    }

    #invitationCopy(link) {
        copyToClipboard(link);
    }

    #createContextMenuButton(className, innerHTML, onclick, title = "") {
        const DIV = document.createElement('div');
        DIV.className = className;
        DIV.innerHTML = innerHTML;
        DIV.onclick = onclick;
        DIV.title = title;
        return DIV;
    }
}
export default class ServerSettingsController {
    #server;
    #fetcher;
    #currentTab;
    #mediaUrl;
    #coreUrl;
    #popupData = {
        name: null,
        type: null
    };
    #structureData = { items: [] };
    #roomsData = [];
    #roomsNotRendered = [];
    #draggedElement = null;

    constructor(server, fetcher, mediaUrl) {
        this.#server = server;
        this.#fetcher = fetcher;
        this.#mediaUrl = mediaUrl;

        this.#loadRisks();
        this.#overviewLoad();
        this.#memberLoad();
    }

    riskModify() {
        this.#loadRisks(false);
    }

    async #loadRisks(select = true) {
        const me = await this.#fetcher.fetchCore(`/user/me`);
        const isAdmin = me.type === "ADMIN";
        const flattenRisks = await this.#fetcher.fetchCore(`/user/server/${this.#server.id}/risks`);

        this.#selectEventHandler(flattenRisks, isAdmin);
        this.#attachEventsFromRisks(flattenRisks, isAdmin);

        if (select) {
            this.#select('overview');
        }
    }

    async #attachEventsFromRisks(flattenRisks, isAdmin) {
        const overviewRisks = ['SERVER_UPDATE'];
        const roomRisks = ['SERVER_ROOM_UPDATE'];
        const rolesRisks = ['ADD_ROLE', 'UPDATE_ROLE', 'ADD_USER_ROLE'];
        const emoteRisks = ['ADD_EMOTE', 'UPDATE_EMOTE', 'REMOVE_EMOTE'];
        const invitationRisks = ['SERVER_INVITATION_ADD', 'SERVER_INVITATION_FETCH'];

        if (isAdmin || flattenRisks.some(elem => overviewRisks.includes(elem))) {
            this.#overviewEventHandler();
        }
        else {
            this.#overviewEventHandler(true);
        }

        if (isAdmin || flattenRisks.some(elem => roomRisks.includes(elem))) {
            this.#structureLoad();
            this.#roomLoad();
            this.#roomEventHandler();
        }
        else {
            this.#roomEventHandler(true);
        }

        if (isAdmin || flattenRisks.some(elem => rolesRisks.includes(elem))) {
            this.#rolesLoad();
        }
        else {
            this.#rolesLoad(true);
        }

        if (isAdmin || flattenRisks.some(elem => emoteRisks.includes(elem))) {
            this.#emotesLoad();
        }

        if (isAdmin || flattenRisks.some(elem => invitationRisks.includes(elem))) {
            this.#invitationLoad();
            this.#invitationEventHandler();
        }
        else {
            this.#invitationEventHandler(true);
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
            if (isAdmin || param.risks) {
                if (isAdmin || flattenRisks.some(elem => param.risks.includes(elem))) {
                    const button = document.getElementById(`server-setting-tab-${param.button}`);
                    button.classList.remove('hidden');
                    button.addEventListener('click', () => this.#select(param.button));
                }
            } else {
                const button = document.getElementById(`server-setting-tab-${param.button}`);
                button.classList.remove('hidden');
                button.addEventListener('click', () => this.#select(param.button));
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
            button.removeEventListener('click', null);
        }
        else {
            document.getElementById('server-setting-overview-name').classList.add('hidden');
            document.getElementById('server-setting-overview-name-input').classList.remove('hidden');
            const button = document.getElementById(`server-setting-overview-save`);
            button.classList.remove('hidden');
            button.addEventListener('click', () => this.#overviewSave());
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
                title: `Server name invalid`,
                animation: false,
                customClass: SwalCustomClass,
                showCancelButton: false,
                confirmButtonText: "OK",
                allowOutsideClick: false,
            });
            return;
        }

        const result = await this.#fetcher.fetchCore(`/server/${this.#server.id}`, 'PATCH', { name: serverName })
        if (result) {
            this.#server.name = result.name;
            this.#overviewLoad();
        }
    }

    // ROOMS AND STRUCTURE
    #roomEventHandler(remove) {
        if (remove) {
            document.getElementById(`server-setting-tab-rooms`).classList.add('hidden');
            document.getElementById(`server-setting-structure-save`).removeEventListener('click', null);
            document.getElementById(`server-setting-room-add`).removeEventListener('click', null);
            document.getElementById(`server-setting-category-add`).removeEventListener('click', null);
        }
        else {
            document.getElementById(`server-setting-tab-rooms`).classList.remove('hidden');
            document.getElementById(`server-setting-structure-save`).addEventListener('click', () => this.#structureSave());
            document.getElementById(`server-setting-room-add`).addEventListener('click', () => this.#roomAdd());
            document.getElementById(`server-setting-category-add`).addEventListener('click', () => this.#categoryAdd());
        }
    }

    async #roomLoad() {
        const roomResult = await RVC.fetcher.fetchCore(`/server/${RVC.server.id}/room`, 'GET');
        if (roomResult) {
            this.#roomsData = {};
            for (const room of roomResult) {
                this.#roomsData[room.id] = room;
            }
            this.#render();
        }
    }

    async #structureLoad() {
        const struct = await RVC.fetcher.fetchCore(`/server/${RVC.server.id}/structure`, 'GET');
        if (struct) {
            this.#structureData = struct;
            this.#render();
        }
    }

    async #roomAdd() {
        this.#popupData.name = 'New room';
        this.#popupData.type = 'TEXT';

        Swal.fire({
            title: 'Add a room',
            animation: false,
            customClass: SwalCustomClass,
            showCancelButton: true,
            focusConfirm: false,
            confirmButtonText: "Add",
            allowOutsideClick: false,
            html: `
            <form class='popup'>
                <label>Room name</label>
                <input type='text' id='popup-name'>
                <br/>
                <br/>
                <label>Room type</label>
                <select id='popup-type'>
                    <option value='TEXT'>Text</option>
                    <option value='VOICE'>Voice (Built-in)</option>
                </select>
            </form>`,
            didOpen: () => {
                document.getElementById('popup-name').oninput = () => { this.#popupData.name = document.getElementById('popup-name').value };
                document.getElementById('popup-type').oninput = () => { this.#popupData.type = document.getElementById('popup-type').value };
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
            title: `Edit room '${data.name}'`,
            animation: false,
            customClass: SwalCustomClass,
            showCancelButton: true,
            focusConfirm: false,
            confirmButtonText: "Edit",
            allowOutsideClick: false,
            html: `
            <form class='popup'>
                <label>Room name</label>
                <input type='text' id='popup-name' value='${data.name}'>
            </form>`,
            didOpen: () => {
                document.getElementById('popup-name').oninput = () => { this.#popupData.name = document.getElementById('popup-name').value };
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
            title: `Delete room '${data.name}'`,
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
            title: `Edit category '${item.name}'`,
            animation: false,
            customClass: SwalCustomClass,
            showCancelButton: true,
            focusConfirm: false,
            confirmButtonText: "Edit",
            allowOutsideClick: false,
            html: `
            <form class='popup'>
                <label>Category name</label>
                <input type='text' id='popup-name' value='${item.name}'>
            </form>`,
            didOpen: () => {
                document.getElementById('popup-name').oninput = () => { this.#popupData.name = document.getElementById('popup-name').value };
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
            title: `Delete category '${item.name}'`,
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

        parent.forEach(item => {
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
        })
    }

    #handleDragStart(e, item) {
        if (!this.#draggedElement) {
            this.#draggedElement = {
                item: item,
                sourceParent: this.#findParent(item)
            };
            e.target.classList.add('dragging');
            const dropZones = document.querySelectorAll('.server-structure-drop-zone');
            dropZones.forEach(dropZone => dropZone.classList.add('active'));
        }
    }

    #handleDragEnd(e) {
        e.target.classList.remove('dragging');
        //this.#draggedElement = null;
        const dropZones = document.querySelectorAll('.server-structure-drop-zone');
        dropZones.forEach(dropZone => dropZone.classList.remove('active'));
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
                    <button class="server-structure-btn btn-edit" data-item='${JSON.stringify(item)}'><revoice-icon-pencil class="size-smaller"></revoice-icon-pencil></button>
                    <button class="server-structure-btn btn-delete" data-item='${JSON.stringify(item)}' data-parent='${JSON.stringify(parentItems)}'><revoice-icon-trash class="size-smaller"></revoice-icon-trash></button>
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
            item.items.forEach(childItem => {
                const renderedItem = this.#renderItem(childItem, item.items, level + 1)
                if (renderedItem) {
                    childrenDiv.appendChild(renderedItem);
                }
                childrenDiv.appendChild(this.#renderDropZone(item, posSubCategory++));
            });

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
        existingItems.forEach(item => item.remove());

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
        this.#structureData.items.forEach(item => {
            const renderedItem = this.#renderItem(item, this.#structureData.items)
            if (renderedItem) {
                container.appendChild(renderedItem);
            }
            container.appendChild(this.#renderDropZone(this.#structureData, posMain++, "server-root-zone"));
        });

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
            document.getElementById('server-setting-invitation-create').removeEventListener('click', null);
        }
        else {
            document.getElementById('server-setting-invitation-create').addEventListener('click', () => this.#invitationCreate());
        }
    }

    async #invitationLoad() {
        const serverId = this.#server.id;
        const result = await this.#fetcher.fetchCore(`/invitation/server/${serverId}`, 'GET');

        if (result) {
            const list = document.getElementById("server-setting-invitation");
            list.innerHTML = "";

            for (const invitation of result) {
                if (invitation.status === 'CREATED') {
                    list.appendChild(await this.#invitationCreateItem(invitation));
                }
            }
        }
    }

    async #invitationCreate() {
        const serverId = this.#server.id;
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
        DIV_NAME.innerText = `${data.id} (${data.status})`;
        DIV.appendChild(DIV_NAME);

        // Context menu
        const DIV_CM = document.createElement('div');
        DIV_CM.className = "context-menu";
        DIV_CM.appendChild(createContextMenuButton("icon", "<revoice-icon-clipboard></revoice-icon-clipboard>", () => this.#invitationCopy(data.id)));
        DIV_CM.appendChild(createContextMenuButton("icon", "<revoice-icon-trash></revoice-icon-trash>", () => this.#invitationDelete(data)));
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
        const url = document.location.href.slice(0, -11) + `index.html?register=&invitation=${link}&host=${this.#coreUrl}`;
        copyToClipboard(url);
    }
}
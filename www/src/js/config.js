const currentConfig = {
    active: null,
}

const popupData = {
    name: null,
    type: null
};

async function configLoad() {
    // Preload
    await loadOverview()
    await loadRoomData();
    await loadRoomStructure();
    await loadServerRoles();
    await loadMembers();
    await loadInvitations();

    selectConfigItem("overview");
}

function selectConfigItem(name) {
    if (currentConfig.active !== null) {
        document.getElementById(currentConfig.active).classList.remove("active");
        document.getElementById(`${currentConfig.active}-config`).classList.add("hidden");
    }

    currentConfig.active = name;
    document.getElementById(name).classList.add('active');
    document.getElementById(`${name}-config`).classList.remove('hidden');
}

function createContextMenuButton(className, innerHTML, onclick, title = "") {
    const DIV = document.createElement('div');
    DIV.className = className;
    DIV.innerHTML = innerHTML;
    DIV.onclick = onclick;
    DIV.title = title;
    return DIV;
}

async function loadMembers() {
    const result = await fetchCoreAPI(`/server/${global.server.id}/user`, 'GET');

    if (result) {
        const sortedByDisplayName = [...result].sort((a, b) => {
            return a.displayName.localeCompare(b.displayName);
        });

        if (sortedByDisplayName !== null) {
            const userList = document.getElementById("config-members-list");
            userList.innerHTML = "";
            for (const user of sortedByDisplayName) {
                userList.appendChild(await createItemUser(user));
            }
        }
    }
}

async function loadServerRoles() {
    document.getElementById("roles-config-component")
            .setAttribute("server-id", global.server.id)
}

async function createItemUser(data) {
    const DIV = document.createElement('div');
    DIV.id = data.id;
    DIV.className = `${data.id} config-item`;

    const profilePicture = `${global.url.media}/profiles/${data.id}`;

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

async function loadOverview() {
    const id = global.server.id;
    const serverInfo = await fetchCoreAPI(`/server/${id}`, 'GET');

    document.getElementById('config-server-uuid').innerText = serverInfo.id;
    document.getElementById('config-server-name').value = serverInfo.name;
}

async function serverSettingsSave() {
    const spinner = new SpinnerOnButton("save-server-settings-button")
    spinner.run()
    await updateServerName(document.getElementById("config-server-name"))
    spinner.success()
}

async function updateServerName(input) {
    const serverName = input.value;

    if (!serverName) {
        console.error("Display name is incorrect");
        return;
    }

    const id = global.server.id;
    const result = await fetchCoreAPI(`/server/${id}`, 'PATCH', { name: serverName })
    if (result) {
        document.getElementById('config-server-name').value = result.name;
        global.server.name = result.name
    }
}

/* INVITATIONS */
async function configAddInvitation() {
    const serverId = global.server.id;
    const result = await fetchCoreAPI(`/invitation/server/${serverId}`, 'POST');
    if (result.status === "CREATED") {
        loadInvitations();
        Swal.fire({
            title: `New invitation`,
            html: `<input class='swal-input' type='text' value='${result.id}' readonly>`,
            animation: false,
            customClass: {
                title: "swalTitle",
                popup: "swalPopup",
                confirmButton: "swalConfirm",
            },
            showCancelButton: false,
            confirmButtonText: "OK",
            allowOutsideClick: false,
        })
    }
}

async function createItemInvitation(data) {
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
    DIV_CM.appendChild(createContextMenuButton("icon", "<revoice-icon-clipboard></revoice-icon-clipboard>", () => copyInvitation(data.id)));
    DIV_CM.appendChild(createContextMenuButton("icon", "<revoice-icon-trash></revoice-icon-trash>", () => deleteInvitation(data)));
    DIV.appendChild(DIV_CM);

    return DIV;
}

async function loadInvitations() {
    const serverId = global.server.id;
    const result = await fetchCoreAPI(`/invitation/server/${serverId}`, 'GET');

    if (result) {
        const list = document.getElementById("config-invitations-list");
        list.innerHTML = "";

        for (const invitation of result) {
            if (invitation.status === 'CREATED') {
                list.appendChild(await createItemInvitation(invitation));
            }
        }
    }
}

async function deleteInvitation(data) {
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
            await fetchCoreAPI(`/invitation/${data.id}`, 'DELETE');
            loadInvitations();
        }
    });
}

async function copyInvitation(link) {
    const url = document.location.href.slice(0, -11) + `index.html?register=&invitation=${link}&host=${global.url.core}`;
    copyToClipboard(url);
}


/* ROOMS */
let structureData = { items: [] };
let roomsData = [];
let roomsNotRendered = [];
let draggedElement = null;

async function createItemRoom(data) {
    const DIV = document.createElement('div');
    DIV.id = data.id;
    DIV.className = "config-item";

    // Name
    const DIV_NAME = document.createElement('div');
    DIV_NAME.className = "name";
    DIV_NAME.innerText = data.name;
    DIV.appendChild(DIV_NAME);

    // Context menu
    const DIV_CM = document.createElement('div');
    DIV_CM.className = "context-menu";
    DIV_CM.appendChild(createContextMenuButton("icon", "<revoice-icon-clipboard></revoice-icon-clipboard>", () => copyToClipboard(data.id), "Copy ID"));
    DIV_CM.appendChild(createContextMenuButton("icon", "<revoice-icon-pencil></revoice-icon-pencil>", () => configEditRoom(data), "Edit room"));
    DIV_CM.appendChild(createContextMenuButton("icon", "<revoice-icon-trash></revoice-icon-trash>", () => configDeleteRoom(data), "Delete room"));
    DIV.appendChild(DIV_CM);

    return DIV;
}

async function loadRoomData() {
    const roomResult = await fetchCoreAPI(`/server/${global.server.id}/room`, 'GET');
    if (roomResult) {
        roomsData = {};
        for (const room of roomResult) {
            roomsData[room.id] = room;
        }
        render();
    }
}

async function loadRoomStructure() {
    const struct = await fetchCoreAPI(`/server/${global.server.id}/structure`, 'GET');
    if (struct) {
        structureData = struct;
        render();
    }
}

async function roomAdd() {
    popupData.name = 'New room';
    popupData.type = 'TEXT';

    Swal.fire({
        title: 'Add a room',
        animation: false,
        customClass: {
            title: "swalTitle",
            popup: "swalPopup",
            cancelButton: "swalCancel",
            confirmButton: "swalConfirm",
        },
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: "Add",
        allowOutsideClick: false,
        html: `
            <form class='popup'>
                <label>Room name</label>
                <input type='text' oninput='popupData.name=value'>
                <br/>
                <br/>
                <label>Room type</label>
                <select oninput='popupData.type=value'>
                    <option value='TEXT'>Text</option>
                    <option value='VOICE'>Voice (Built-in)</option>
                    <option value='WEBRTC'>Voice (WebRTC)</option>
                </select>
            </form>       
        `,
    }).then(async (result) => {
        if (result.value) {
            await fetchCoreAPI(`/server/${global.server.id}/room`, 'PUT', { name: popupData.name, type: popupData.type });
            await loadRoomData();
        }
    });
}

async function roomEdit(item) {
    const data = roomsData[item.id];
    popupData.name = data.name;

    Swal.fire({
        title: `Edit room '${data.name}'`,
        animation: false,
        customClass: {
            title: "swalTitle",
            popup: "swalPopup",
            cancelButton: "swalCancel",
            confirmButton: "swalConfirm",
        },
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: "Edit",
        allowOutsideClick: false,
        html: `
            <form class='popup'>
                <label>Room name</label>
                <input type='text' oninput='popupData.name=value' value='${data.name}'>
            </form>       
        `,
    }).then(async (result) => {
        if (result.value) {
            await fetchCoreAPI(`/room/${data.id}`, 'PATCH', { name: popupData.name, type: popupData.type });
            await loadRoomData();
        }
    });
}

async function roomDelete(item) {
    const data = roomsData[item.id];
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
            await fetchCoreAPI(`/room/${data.id}`, 'DELETE');
            await loadRoomData();
        }
    });
}

function categoryAdd(parentItems = null) {
    const newCategory = {
        type: "CATEGORY",
        name: "New category",
        items: []
    };

    if (parentItems) {
        parentItems.push(newCategory);
    } else {
        structureData.items.push(newCategory);
    }

    render();
}

function categoryEdit(item) {
    popupData.name = item.name;

    Swal.fire({
        title: `Edit category '${item.name}'`,
        animation: false,
        customClass: {
            title: "swalTitle",
            popup: "swalPopup",
            cancelButton: "swalCancel",
            confirmButton: "swalConfirm",
        },
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: "Edit",
        allowOutsideClick: false,
        html: `
            <form class='popup'>
                <label>Category name</label>
                <input type='text' oninput='popupData.name=value' value='${item.name}'>
            </form>       
        `,
    }).then(async (result) => {
        if (result.value) {
            item.name = popupData.name;
            render();
        }
    });
}

function categoryDelete(item, parentItems) {
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
            render();
        }
    });
}

function showStructureAsJSON() {
    const modal = document.getElementById('jsonModal');
    modal.classList.add('show');
}

function closeModal() {
    document.getElementById('jsonModal').classList.remove('show');
}

function handleDragStart(e, item) {
    if (!draggedElement) {
        draggedElement = {
            item: item,
            sourceParent: findParent(item)
        };
        e.target.classList.add('dragging');
        const dropZones = document.querySelectorAll('.server-structure-drop-zone');
        dropZones.forEach(dropZone => dropZone.classList.add('active'));
    }
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedElement = null;
    const dropZones = document.querySelectorAll('.server-structure-drop-zone');
    dropZones.forEach(dropZone => dropZone.classList.remove('active'));
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e, targetParentItems, position) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    if (!draggedElement) return;

    const { item, sourceParent } = draggedElement;

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
    draggedElement = null;
    render();
}

function findParent(targetItem, items = structureData.items) {
    for (let item of items) {
        if (item === targetItem) {
            return structureData.items;
        }
        if (item.type === 'CATEGORY' && item.items) {
            if (item.items.includes(targetItem)) {
                return item.items;
            }
            const found = findParent(targetItem, item.items);
            if (found) return found;
        }
    }
    return null;
}

function renderItem(item, parentItems, level = 0) {
    const itemDiv = document.createElement('div');
    itemDiv.className = `server-structure-tree-item server-structure-${item.type.toLowerCase()}`;
    itemDiv.draggable = true;

    itemDiv.addEventListener('dragstart', (e) => handleDragStart(e, item));
    itemDiv.addEventListener('dragend', handleDragEnd);

    const headerDiv = document.createElement('div');
    headerDiv.className = 'server-structure-item-header';

    switch (item.type) {
        case 'ROOM': {
            // Remove room being rendered from list of not render
            roomsNotRendered = roomsNotRendered.filter((id) => id !== item.id);

            const room = roomsData[item.id];
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
                roomEdit(item);
                break;
            case 'CATEGORY':
                categoryEdit(item);
                break;
        }
    };

    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        switch (item.type) {
            case 'ROOM':
                roomDelete(item);
                break;
            case 'CATEGORY':
                categoryDelete(item, parentItems);
                break;
        }
    };

    if (item.type === 'CATEGORY') {
        const categoryAddBtn = headerDiv.querySelector('.btn-add');
        categoryAddBtn.onclick = (e) => {
            e.stopPropagation();
            categoryAdd(item.items);
        };
    }

    itemDiv.appendChild(headerDiv);

    if (item.type === 'CATEGORY' && item.items && item.items.length > 0) {
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'server-structure-item-children';
        childrenDiv.appendChild(renderDropZone(item, 0));
        let posSubCategory = 1
        item.items.forEach(childItem => {
            const renderedItem = renderItem(childItem, item.items, level + 1)
            if (renderedItem) {
                childrenDiv.appendChild(renderedItem);
            }
            childrenDiv.appendChild(renderDropZone(item, posSubCategory++));
        });

        itemDiv.appendChild(childrenDiv);
    } else if (item.type === 'CATEGORY') {
        // Catégorie vide
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'server-structure-item-children';
        emptyDiv.appendChild(renderDropZone(item, 0));
        itemDiv.appendChild(emptyDiv);
    }

    return itemDiv;
}

function renderDropZone(item, position, classNames = "") {
    const dropZone = document.createElement('div');
    dropZone.className = 'server-structure-drop-zone ' + classNames;
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', (e) => handleDrop(e, item.items, position));
    return dropZone;
}

function render() {
    const container = document.getElementById('treeContainer');
    // Clear existing items but keep root drop zone
    const existingItems = container.querySelectorAll('.server-structure-tree-item, .server-root-zone');
    existingItems.forEach(item => item.remove());

    // Setup root drop zone
    const rootDropZone = document.getElementById('rootDropZone');
    rootDropZone.addEventListener('dragover', handleDragOver);
    rootDropZone.addEventListener('dragleave', handleDragLeave);
    rootDropZone.addEventListener('drop', (e) => handleDrop(e, structureData.items, 0));

    // Build items list from roomsData 
    for (const key in roomsData) {
        roomsNotRendered.push(key);
    }

    // Render all items in structure
    let posMain = 1
    structureData.items.forEach(item => {
        const renderedItem = renderItem(item, structureData.items)
        if (renderedItem) {
            container.appendChild(renderedItem);
        }
        container.appendChild(renderDropZone(structureData, posMain++, "server-root-zone"));
    });

    // Render remaining rooms
    for (const room of roomsNotRendered) {
        container.appendChild(renderItem({ id: room, type: 'ROOM' }, null));
    }
}

async function structureSave() {
    const spinner = new SpinnerOnButton("structure-save-button")
    spinner.run()
    structureClean(structureData.items);

    try {
        await fetchCoreAPI(`/server/${global.server.id}/structure`, 'PATCH', structureData);
        spinner.success()
    }
    catch (error) {
        spinner.error()
        console.error("CONFIG : Updating structure:", error)
    }
}

function structureClean(parent) {
    if (parent === null || parent === undefined) {
        return;
    }

    parent.forEach(item => {
        if (item.type === 'CATEGORY') {
            structureClean(item.items);
        }
        if (item.type === 'ROOM') {
            if (roomsData[item.id] === undefined) {
                const index = parent.indexOf(item);
                if (index > -1) {
                    parent.splice(index, 1);
                }
            }
        }
    })
}
const currentConfig = {
    active: null,
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('config-server-uuid').innerText = global.server.id;
    document.getElementById('config-server-name').value = global.server.name;
    selectConfigItem("overview");
});

document.getRootNode().addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.location.href = "app.html";
    }
});

function selectConfigItem(name) {
    if (currentConfig.active !== null) {
        document.getElementById(currentConfig.active).classList.remove("active");
        document.getElementById(`${currentConfig.active}-config`).classList.add("hidden");
    }

    currentConfig.active = name;
    document.getElementById(name).classList.add('active');
    document.getElementById(`${name}-config`).classList.remove('hidden');

    switch (name) {
        case 'rooms':
            loadRooms();
            break;

        case 'room-structure':
            loadRoomStructure();
            break;

        case 'members':
            loadMembers();
            break;

        case 'invitations':
            loadInvitations();
            break;
    }
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

            let tempList = [];
            for (const user of sortedByDisplayName) {
                tempList.push(user.id);
            }
            const usersPfpExist = await fileBulkExistMedia("/profiles/bulk", tempList);

            for (const user of sortedByDisplayName) {
                userList.appendChild(await createItemUser(user, usersPfpExist[user.id]));
            }
        }
    }
}

async function createItemUser(data, userPfpExist) {
    const DIV = document.createElement('div');
    DIV.id = data.id;
    DIV.className = "config-item";

    let profilePicture = "src/img/default-avatar.webp";
    if (userPfpExist) {
        profilePicture = `${global.url.media}/profiles/${data.id}`;
    }

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
        global.user.displayName = result.name
    }
}

const FORM_DATA = {
    name: null,
    type: null
};


/* INVITATIONS */
async function configAddInvitation() {
    const serverId = global.server.id;
    const result = await fetchCoreAPI(`/invitation/server/${serverId}`, 'POST');
    console.log(result);
    if (result.status === "CREATED") {
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
            list.appendChild(await createItemInvitation(invitation));
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
let structureData = {items: []};
let detailedRoomData = [];

let currentEditingItem = null;
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

async function loadRooms() {
    const roomResult = await fetchCoreAPI(`/server/${global.server.id}/room`, 'GET');
    const struct = await fetchCoreAPI(`/server/${global.server.id}/structure`, 'GET');
    if (struct && roomResult) {

        detailedRoomData = [];
        for (const room of roomResult) {
            detailedRoomData[room.id] = room;
        }
        structureData = struct;

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        });

        document.getElementById('editModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                closeModal();
            }
        });

        render();
    }
}

async function configAddRoom() {
    FORM_DATA.name = 'New room';
    FORM_DATA.type = 'TEXT';

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
            <form class='config'>
                <label>Room name</label>
                <input type='text' oninput='FORM_DATA.name=value'>
                <br/>
                <br/>
                <label>Room type</label>
                <select oninput='FORM_DATA.type=value'>
                    <option value='TEXT'>Text</option>
                    <option value='VOICE'>Voice (Built-in)</option>
                    <option value='WEBRTC'>Voice (WebRTC)</option>
                </select>
            </form>       
        `,
    }).then(async (result) => {
        if (result.value) {
            const newRoom = await fetchCoreAPI(`/server/${global.server.id}/room`, 'PUT', { name: FORM_DATA.name, type: FORM_DATA.type });
            loadRooms();
            structureData.items.push({
                type: "ROOM",
                id: newRoom.id
            });
            detailedRoomData[newRoom.id] = newRoom
            render();
        }
    });
}

async function configEditRoom(data) {
    FORM_DATA.name = data.name;

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
            <form class='config'>
                <label>Room name</label>
                <input type='text' oninput='FORM_DATA.name=value' value='${data.name}'>
            </form>       
        `,
    }).then(async (result) => {
        if (result.value) {
            await fetchCoreAPI(`/room/${data.id}`, 'PATCH', { name: FORM_DATA.name, type: FORM_DATA.type });
            loadRooms();
        }
    });
}

async function configDeleteRoom(data) {
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
            loadRooms();
        }
    });
}

function addCategory(parentItems = null) {
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

function showStructureAsJSON() {
    const modal = document.getElementById('jsonModal');
    modal.classList.add('show');
}

function editItem(item) {
    currentEditingItem = item;
    const modal = document.getElementById('editModal');
    const modalTitle = document.getElementById('modalTitle');
    const itemName = document.getElementById('itemName');
    const itemId = document.getElementById('itemId');
    const idGroup = document.getElementById('idGroup');

    if (item.type === 'ROOM') {
        modalTitle.textContent = 'Éditer Room';
        itemName.value = item.name || '';
        itemId.value = item.id || '';
        idGroup.style.display = 'block';
        itemName.placeholder = 'Nom de la room (optionnel)';
    } else {
        modalTitle.textContent = 'Éditer Catégorie';
        itemName.value = item.name || '';
        idGroup.style.display = 'none';
        itemName.placeholder = 'Nom de la catégorie';
    }

    modal.classList.add('show');
}

function deleteItem(item, parentItems) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
        const index = parentItems.indexOf(item);
        if (index > -1) {
            parentItems.splice(index, 1);
        }
        render();
    }
}

function saveItem() {
    const itemName = document.getElementById('itemName').value.trim();
    const itemId = document.getElementById('itemId').value.trim();

    if (currentEditingItem.type === 'ROOM') {
        if (itemName) currentEditingItem.name = itemName;
        if (itemId) currentEditingItem.id = itemId;
    } else if (itemName) currentEditingItem.name = itemName;

    closeModal();
    render();
}

function closeModal() {
    document.getElementById('editModal').classList.remove('show');
    document.getElementById('jsonModal').classList.remove('show');
    currentEditingItem = null;
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

    if (item.type === 'ROOM') {
        const room = detailedRoomData[item.id]
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
                    <button class="server-structure-btn btn-edit" onclick="event.stopPropagation(); editItem(arguments[0])" 
                            data-item='${JSON.stringify(item)}'><revoice-icon-pencil class="size-smaller"></revoice-icon-pencil></button>
                    <button class="server-structure-btn btn-delete" onclick="event.stopPropagation(); deleteItem(arguments[0], arguments[1])"
                            data-item='${JSON.stringify(item)}' data-parent='${JSON.stringify(parentItems)}'><revoice-icon-trash class="size-smaller"></revoice-icon-trash></button>
                </div>`;
    } else if (item.type === 'CATEGORY') {
        headerDiv.innerHTML = `
                <span class="server-structure-item-icon"><revoice-icon-folder class="size-small"></revoice-icon-folder></span>
                <div class="server-structure-item-content">
                    <span class="server-structure-item-name">${item.name}</span>
                </div>
                <div class="server-structure-item-actions">
                    <button class="server-structure-btn btn-edit" onclick="event.stopPropagation(); editItem(arguments[0])" 
                            data-item='${JSON.stringify(item)}'><revoice-icon-pencil class="size-smaller"></revoice-icon-pencil></button>
                    <button class="server-structure-btn btn-delete" onclick="event.stopPropagation(); deleteItem(arguments[0], arguments[1])"
                            data-item='${JSON.stringify(item)}' data-parent='${JSON.stringify(parentItems)}'><revoice-icon-trash class="size-smaller"></revoice-icon-trash></button>
                    <button class="server-structure-btn btn-add" onclick="event.stopPropagation(); addCategory(arguments[0].items)"><revoice-icon-folder-plus class="size-smaller"></revoice-icon-folder-plus></button>
                </div>`;
    }

    // Corriger les event listeners pour les boutons
    const editBtn = headerDiv.querySelector('.btn-edit');
    const deleteBtn = headerDiv.querySelector('.btn-delete');

    editBtn.onclick = (e) => {
        e.stopPropagation();
        editItem(item);
    };

    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteItem(item, parentItems);
    };

    if (item.type === 'CATEGORY') {
        const addCategoryBtn = headerDiv.querySelector('.btn-add');
        addCategoryBtn.onclick = (e) => {
            e.stopPropagation();
            addCategory(item.items);
        };
    }

    itemDiv.appendChild(headerDiv);

    if (item.type === 'CATEGORY' && item.items && item.items.length > 0) {
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'server-structure-item-children';
        childrenDiv.appendChild(renderDropZone(item, 0));
        let posSubCategory = 1
        item.items.forEach(childItem => {
            childrenDiv.appendChild(renderItem(childItem, item.items, level + 1));
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

    // Render all items
    let posMain = 1
    structureData.items.forEach(item => {
        container.appendChild(renderItem(item, structureData.items));
        container.appendChild(renderDropZone(structureData, posMain++, "server-root-zone"));
    });

    // Update JSON display
    document.getElementById('jsonOutput').textContent = JSON.stringify(structureData, null, 2);
}

function exportJSON() {
    const dataStr = JSON.stringify(structureData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = 'room-structure.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    structureData = JSON.parse(e.target.result);
                    render();
                } catch (error) {
                    alert('Erreur lors de l\'import du fichier JSON: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

async function configUpdateStructure() {
    try {
        await fetchCoreAPI(`/server/${global.server.id}/structure`, 'PATCH', structureData);
    }
    catch (error) {
        console.error("CONFIG : Updating structure:", error)
    }
}
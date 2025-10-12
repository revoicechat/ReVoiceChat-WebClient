document.getElementById("text-input").addEventListener('keydown', async function (e) {
    if (e.key === 'Enter') {
        if (e.shiftKey) {
            return;
        }
        e.preventDefault();
        await sendMessage();
        return;
    }

    if (e.key === 'Escape') {
        document.getElementById("text-input").value = "";
        global.chat.mode = "send";
    }
});

const picker = new EmojiPicker();
picker.init()
    .then(async () => {
        await initCustomGeneral(picker)
        await initCustomUser(picker)
        await initCustomServer(picker)
        const pickerContainer = document.getElementById('emoji-picker');
        pickerContainer.appendChild(picker.create());
        // Gestion de l'interface
        const emojiBtn = document.getElementById('emoji-picker-button');
        const messageInput = document.getElementById('text-input');

        // Toggle emoji picker
        emojiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            pickerContainer.classList.toggle('show');
        });

        // Fermer le picker en cliquant ailleurs
        document.addEventListener('click', (e) => {
            if (!pickerContainer.contains(e.target) && e.target !== emojiBtn) {
                pickerContainer.classList.remove('show');
            }
        });

        // Sélection d'emoji
        picker.onEmojiSelect = (emoji) => {
            const cursorPos = messageInput.selectionStart;
            const textBefore = messageInput.value.substring(0, cursorPos);
            const textAfter = messageInput.value.substring(cursorPos);

            messageInput.value = textBefore + emoji + textAfter;
            messageInput.focus();
            messageInput.selectionStart = messageInput.selectionEnd = cursorPos + emoji.length;
        };
    })

async function getMessages(roomId) {
    const result = await RVC.fetchCore(`/room/${roomId}/message`, 'GET');

    if (result !== null) {
        const ROOM = document.getElementById("text-content");

        const sortedResult = [...result.content].sort((a, b) => {
            return new Date(a.createdDate) - new Date(b.createdDate);
        });

        ROOM.innerHTML = "";
        for (const message of sortedResult) {
            ROOM.appendChild(createMessage(message));
        }

        ROOM.scrollTop = ROOM.scrollHeight;
    }
}

function createMessage(messageData) {
    const DIV = document.createElement('div');
    DIV.id = `container-${messageData.id}`;
    DIV.className = "message-container";
    DIV.innerHTML = `
        <div class="message-header">
            <h3 class="message-owner">${messageData.user.displayName} <span class="message-timestamp">${timestampToText(messageData.createdDate)}</span></h3>
            ${createMessageContextMenu(messageData)}
        </div>
        <revoice-message id="${messageData.id}">
            <script type="application/json" slot="medias">
                ${JSON.stringify(messageData.medias)}
            </script>
            <script type="text/markdown" slot="content">
                ${messageData.text}
            </script>
            <script type="application/json" slot="emotes">
                ${JSON.stringify(messageData.emotes)}
            </script>
        </revoice-message>
    `;
    return DIV;
}

function createMessageContextMenu(messageData) {
    if (messageData.user.id == RVC.user.id) {
        return `
        <div class="message-context-menu">
            <div class="icon" onclick="editMessage('${messageData.id}')"><revoice-icon-pencil></revoice-icon-pencil></div>
            <div class="icon" onclick="deleteMessage('${messageData.id}')"><revoice-icon-trash></revoice-icon-trash></div>
        </div>
        `;
    }

    return "";
}

const emojiSelect = (emoji) => picker.onEmojiSelect(emoji)

async function sendMessage() {
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
    if (input && global.chat.mode === "send") {
        for (const element of input.files) {
            if (element.size < global.chat.attachmentMaxSize) {
                data.medias.push({ name: element.name });
                attachments[element.name] = element;
            }
            else {
                await Swal.fire({
                    icon: "error",
                    title: "File too big",
                    html: `"${element.name}" is too big<br/>Maximum size: ${humanFileSize(global.chat.attachmentMaxSize)}<br/>Your file: ${humanFileSize(element.size)}`,
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

    switch (global.chat.mode) {
        case "send":
            result = await RVC.fetchCore(`/room/${RVC.room.id}/message`, 'PUT', data);
            break;

        case "edit":
            result = await RVC.fetchCore(`/message/${global.chat.editId}`, 'PATCH', data);
            break;
    }

    if (result) {

        // Send attachements
        if (global.chat.mode === "send") {
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
        global.chat.mode = "send";
        global.chat.editId = null;
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

async function deleteMessage(id) {
    await RVC.fetchCore(`/message/${id}`, 'DELETE');
}

async function editMessage(id) {
    const result = await RVC.fetchCore(`/message/${id}`, 'GET');

    if (result) {
        const textarea = document.getElementById("text-input");
        textarea.value = result.text;
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
        global.chat.mode = "edit";
        global.chat.editId = id;
        document.getElementById("text-input").focus();
    }
}

function textInputMode(input) {
    const textarea = document.getElementById("text-input");
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
    if (input.value == "") {
        global.chat.mode = "send";
        global.chat.editId = null;
        console.info("CHAT : Switching to 'send' mode");
    }
}

async function getEmojisGlobal() {
    try {
        const response = await fetch(`${RVC.mediaUrl}/emojis/global/all`, {
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            throw new Error("Not OK");
        }

        global.chat.emojisGlobal = await response.json();
    } catch (error) {
        console.error(`An error occurred while processing your request \n${error}\nHost : ${RVC.mediaUrl}\n`);
        return null;
    }
}

function roomMessage(data) {
    if (data.message.roomId !== RVC.room.id) {
        return;
    }

    const message = data.message;
    const room = document.getElementById("text-content");
    switch (data.action) {
        case "ADD":
            room.appendChild(createMessage(message));
            if(RVC.user.id != message.user.id){
                RVC.alert.play('messageNew');
            }
            break;
        case "MODIFY":
            document.getElementById(message.id).replaceWith(createMessageContent(message));
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

function userUpdate(data) {
    const id = data.id;
    for (const icon of document.querySelectorAll(`.${id} img.icon`)) {
        icon.src = `${RVC.mediaUrl}/profiles/${id}?t=${Date.now()}`;
    }
    for (const name of document.querySelectorAll(`.${id} .name`)) {
        name.innerText = data.displayName;
    }
}

function messageJoinAttachment() {
    const fileInput = document.getElementById("text-attachment");
    fileInput.click();
    document.getElementById("text-attachment-div").classList.remove('hidden');
}

function messageRemoveAttachment() {
    const fileInput = document.getElementById("text-attachment");
    fileInput.value = "";
    document.getElementById("text-attachment-div").classList.add('hidden');
}

async function getAttachmentMaxSize() {
    const response = await RVC.fetchMedia('/maxfilesize');
    global.chat.attachmentMaxSize = response.maxFileSize;
}
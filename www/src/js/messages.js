document.getElementById("text-input").addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        if (e.shiftKey) {
            return;
        }
        sendMessage();
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
    const result = await fetchCoreAPI(`/room/${roomId}/message`, 'GET');

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

function createMessageContent(data) {
    const DIV_CONTENT = document.createElement('revoice-message');
    DIV_CONTENT.id = data.id;
    DIV_CONTENT.innerHTML = `
        <script type="text/markdown" slot="content">
            ${data.text}
        </script>
        <script type="application/json" slot="emotes">
                ${JSON.stringify(data.emotes)}
        </script>`;
    return DIV_CONTENT;
}

function createMessageContextMenu(messageData) {
    if (messageData.user.id == global.user.id) {
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

    // Attachment ?
    const fileInput = document.getElementById("text-attachment");
    const filePath = fileInput.value
    if (filePath) {
        data.medias.push({ name: filenameFromPath(filePath) });
    }

    switch (global.chat.mode) {
        case "send":
            result = await fetchCoreAPI(`/room/${global.room.id}/message`, 'PUT', data);
            break;

        case "edit":
            result = await fetchCoreAPI(`/message/${global.chat.editId}`, 'PATCH', data);
            break;
    }

    if (result) {
        if (global.chat.mode == "send") {
            for (media of result.medias) {
                const formData = new FormData();
                formData.append("file", fileInput.files[0]);
                await fetch(`${global.url.media}/attachments/${result.id}`, {
                    method: "POST",
                    signal: AbortSignal.timeout(5000),
                    headers: {
                        'Authorization': `Bearer ${global.jwtToken}`
                    },
                    body: formData
                });
            }
        }

        // Clean file input
        fileInput.value = "";
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

    console.error("Error while sending message");
}

async function deleteMessage(id) {
    await fetchCoreAPI(`/message/${id}`, 'DELETE');
}

async function editMessage(id) {
    const result = await fetchCoreAPI(`/message/${id}`, 'GET');

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
        const response = await fetch(`${global.url.media}/emojis/global/all`, {
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            throw new Error("Not OK");
        }

        global.chat.emojisGlobal = await response.json();
    } catch (error) {
        console.error(`An error occurred while processing your request \n${error}\nHost : ${global.url.media}\n`);
        return null;
    }
}

function roomMessage(data) {
    if (data.message.roomId !== global.room.id) {
        return;
    }

    const message = data.message;
    const room = document.getElementById("text-content");
    switch (data.action) {
        case "ADD":
            room.appendChild(createMessage(message));
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
    console.log(data);
    const id = data.id;
    document.querySelectorAll(`.${id} img.icon`).forEach(icon => icon.src = `${global.url.media}/profiles/${id}?t=${new Date().getTime()}`);
    document.querySelectorAll(`.${id} .name`).forEach(name => name.innerText = data.displayName);
}

function messageJoinAttachment() {
    const fileInput = document.getElementById("text-attachment");
    fileInput.click();
    fileInput.addEventListener('change', getFileName);
}

function messageRemoveAttachment() {
    const fileInput = document.getElementById("text-attachment");
    fileInput.value = "";
    document.getElementById("text-attachment-div").classList.add('hidden');
}

const getFileName = (event) => {
    const fileInput = document.getElementById("text-attachment");
    const fileInputDiv = document.getElementById("text-attachment-div");
    if (fileInput.value) {
        fileInputDiv.classList.remove('hidden');
    }

    const files = event.target.files;
    const fileName = files[0].name;
    console.log("file name: ", fileName);
}
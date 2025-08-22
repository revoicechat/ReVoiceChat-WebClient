document.getElementById("chat-input").addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }

    if (e.key === 'Escape') {
        document.getElementById("chat-input").value = "";
        current.chat.mode = "send";
    }
});

async function getMessages(roomId) {
    const result = await getRequestOnCore(`/room/${roomId}/message`);

    console.log(result);

    if (result !== null) {
        const ROOM = document.getElementById("room-messages");

        const sortedResult = [...result.content].sort((a, b) => {
            return new Date(a.createdDate) - new Date(b.createdDate);
        });

        ROOM.innerHTML = "";
        for (const neddle in sortedResult) {
            ROOM.appendChild(createMessage(sortedResult[neddle]));
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
    `;

    const DIV_CONTENT = document.createElement('div');
    DIV_CONTENT.className = "message-content";
    DIV_CONTENT.id = messageData.id;
    DIV_CONTENT.innerText = messageData.text;
    DIV.appendChild(DIV_CONTENT);

    return DIV;
}

function createMessageContextMenu(messageData) {
    if (messageData.user.id == current.user.id) {
        return `
        <div class="message-context-menu">
            <div class="icon" onclick="editMessage('${messageData.id}')">${SVG_PENCIL}</div>
            <div class="icon" onclick="deleteMessage('${messageData.id}')">${SVG_TRASH}</div>
        </div>
        `;
    }

    return "";
}

async function sendMessage() {
    let result = null;
    let textInput = sanitizeString(document.getElementById('chat-input').value);

    if (textInput == "" || textInput == null) {
        return;
    }

    switch (current.chat.mode) {
        case "send":
            result = await putRequestOnCore(`/room/${current.room.id}/message`, { text: textInput });
            break;

        case "edit":
            result = await patchRequestOnCore(`/message/${current.chat.editId}`, { text: textInput });
            current.chat.mode = "send";
            current.chat.editId = null;
            break;
    }

    if (result) {
        document.getElementById('chat-input').value = "";
        return;
    }

    console.error("Error while sending message");
}

async function deleteMessage(id) {
    const result = await deleteRequestOnCore(`/message/${id}`);
}

async function editMessage(id) {
    const result = await getRequestOnCore(`/message/${id}`);

    if (result) {
        document.getElementById('chat-input').value = result.text;
        current.chat.mode = "edit";
        current.chat.editId = id;
        document.getElementById("chat-input").focus();
    }
}

function chatMode(input) {
    if (input.value == "") {
        current.chat.mode = "send";
        current.chat.editId = null;
        console.log("Switching to 'send' mode");
    }
}
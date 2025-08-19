document.getElementById("chat-input").addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function getMessages(roomId) {
    const result = await getRequestOnCore(`/room/${roomId}/message`);

    if (result !== null) {
        const ROOM = document.getElementById("room-messages");

        const sortedResult = [...result].sort((a, b) => {
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
            <h3 class="message-owner">${messageData.user.username} <span class="message-timestamp">${timestampToText(messageData.createdDate)}</span></h3>
            ${createMessageContextMenu(messageData)}
        </div>
        <div class="message-content" id="${messageData.id}">${messageData.text}</div>
    `;
    return DIV;
}

function createMessageContextMenu(messageData) {
    if (messageData.user.id == current.user.id) {
        return `
        <div class="message-context-menu">
            <div class="icon" onclick="editMessage('${messageData.id}')"  >
                <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                    <path clip-rule="evenodd" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.596l-2.047.848a.75.75 0 0 1-.98-.98l.848-2.047a2.75 2.75 0 0 1 .596-.892l7.262-7.261Z" fill-rule="evenodd"></path>
                </svg>
            </div>

            <div class="icon" onclick="deleteMessage('${messageData.id}')">
                <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                    <path clip-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" fill-rule="evenodd"></path>
                </svg>
            </div>
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
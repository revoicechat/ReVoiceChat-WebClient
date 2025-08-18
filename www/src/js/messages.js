document.getElementById("chat-input").addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function getMessages(roomId) {
    const result = await getRequestToHost(`/room/${roomId}/message`);

    if (result !== null) {
        const ROOM = document.getElementById("room-messages");

        ROOM.innerHTML = "";
        for (const neddle in result) {
            ROOM.appendChild(createMessage(result[neddle]));
        }

        ROOM.scrollTop = ROOM.scrollHeight;
    }
}

function createMessage(messageData) {
    const DIV = document.createElement('div');
    DIV.id = messageData.id;
    DIV.className = "message-container";
    DIV.innerHTML = `
        <div>
            <h3 class="message-owner">${messageData.user.username}</h3>
            <div class="message-content">${messageData.text}</div>
            <p class="message-timestamp">${timestampToText(messageData.createdDate)}</p>
        </div>`;
    return DIV;
}

async function sendMessage() {
    let textInput = sanitizeString(document.getElementById('chat-input').value);

    if (textInput == "" || textInput == null) {
        return;
    }

    const result = await putRequestToHost(`/room/${current.room.id}/message`, { text: textInput })

    if(result){
        document.getElementById('chat-input').value = "";
        return;
    }
    
    console.error("Error while sending message");
}

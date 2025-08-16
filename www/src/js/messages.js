document.getElementById("message-input").addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function getMessages(roomId) {
    fetch(`${hostUrl}/room/${roomId}/message`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    }).then((response) => {
        if (!response.ok) {
            return;
        }
        return response.json();
    }).then((body) => {
        createMessageList(body);
    });
}

function createMessageList(data) {
    const ROOM = document.getElementById("room-messages");
    ROOM.innerHTML = "";
    for (const neddle in data) {
        ROOM.appendChild(createMessage(data[neddle]));
    }

    ROOM.scrollTop = ROOM.scrollHeight;
}

function createMessage(messageData) {
    const DIV = document.createElement('div');
    DIV.id = messageData.id;
    DIV.className = "flex items-start space-x-2 message-bubble";
    DIV.innerHTML = `
        <div>
            <h3 class="font-semibold text-white truncate">${messageData.user.username}</h3>
            <div class="bg-gray-700 rounded-2xl rounded-tl-sm p-3 shadow-lg">
                <p class="text-white">${messageData.text}</p>
            </div>
            <p class="text-xs text-gray-400 mt-1 ml-2">${timestampToText(messageData.createdDate)}</p>
        </div>`;
    return DIV;
}

function sendMessage() {
    let textInput = sanitizeString(document.getElementById('message-input').value);

    if (textInput == "" || textInput == null) {
        return;
    }

    fetch(`${hostUrl}/room/${currentState.room.id}/message`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: textInput })
    }).then((response) => {
        if (response.ok) {
            document.getElementById('message-input').value = "";
            return;
        }
    });
}
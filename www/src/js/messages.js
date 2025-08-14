

async function getMessages(roomId) {
    fetch(`${hostUrl}/room/${roomId}/chat/messages`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
        headers: {
            'Content-Type': 'application/json'
        }
    }).then((response) => {
        return response.json();
    }).then((body) => {
        createMessageList(body);
    }).catch((error) => {
        console.log(error)
    });
}

function createMessageList(data) {
    const roomList = document.getElementById("room-messages");
    roomList.innerHTML = "";
    for (const neddle in data) {
        roomList.appendChild(createMessage(data[neddle]));
    }
}

function createMessage(messageData) {
    const DIV = document.createElement('div');
    DIV.id = messageData.id;
    DIV.className = "flex items-start space-x-2 message-bubble";
    DIV.innerHTML = `
        <div>
            <h3 class="font-semibold text-white truncate">[OWNER NAME]</h3>
            <div class="bg-gray-700 rounded-2xl rounded-tl-sm p-3 shadow-lg">
                <p class="text-white">${messageData.text}</p>
            </div>
            <p class="text-xs text-gray-400 mt-1 ml-2">${messageData.createdDate}</p>
        </div>`;
    return DIV;
}

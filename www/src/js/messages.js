document.getElementById("text-input").addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }

    if (e.key === 'Escape') {
        document.getElementById("text-input").value = "";
        current.chat.mode = "send";
    }
});

async function getMessages(roomId) {
    const result = await getCoreAPI(`/room/${roomId}/message`);

    if (result !== null) {
        const ROOM = document.getElementById("text-content");

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

    DIV.appendChild(createMessageContent(messageData));
    return DIV;
}

function createMessageContent(data){
    const DIV_CONTENT = document.createElement('div');
    DIV_CONTENT.className = "message-content";
    DIV_CONTENT.id = data.id;
    DIV_CONTENT.innerHTML = injectEmojis(removeTags(data.text));
    return DIV_CONTENT;
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
    let textInput = sanitizeString(document.getElementById('text-input').value);

    if (textInput == "" || textInput == null) {
        return;
    }

    const data = {
        text: textInput,
        medias: []
    }

    switch (current.chat.mode) {
        case "send":
            result = await putCoreAPI(`/room/${current.room.id}/message`, data);
            break;

        case "edit":
            result = await patchCoreAPI(`/message/${current.chat.editId}`, data);
            current.chat.mode = "send";
            current.chat.editId = null;
            break;
    }

    if (result) {
        document.getElementById('text-input').value = "";
        return;
    }

    console.error("Error while sending message");
}

async function deleteMessage(id) {
    const result = await deleteCoreAPI(`/message/${id}`);
}

async function editMessage(id) {
    const result = await getCoreAPI(`/message/${id}`);

    if (result) {
        document.getElementById('text-input').value = result.text;
        current.chat.mode = "edit";
        current.chat.editId = id;
        document.getElementById("text-input").focus();
    }
}

function textInputMode(input) {
    if (input.value == "") {
        current.chat.mode = "send";
        current.chat.editId = null;
        console.info("CHAT : Switching to 'send' mode");
    }
}

async function getEmojisGlobal() {
    try {
        const response = await fetch(`${current.url.media}/emojis/global/all`, {
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            throw "Not OK";
        }

        current.chat.emojisGlobal = await response.json();
    }
    catch (error) {
        console.error(`An error occurred while processing your request \n${error}\nHost : ${current.url.media}\n`);
        return null;
    }
}

function injectEmojis(inputText) {
    let result = [];
    inputArray = inputText.split(" ");

    inputArray.forEach(element => {
        // Not emoji
        if(element.charAt(0) !== ':' && element.charAt(element.length - 1) !== ':'){
            result.push(element);
            return;
        }

        // Emoji
        const emoji = element.substring(1, element.length - 1);
        if(current.chat.emojisGlobal.includes(emoji)){
            result.push(`<img src="${current.url.media}/emojis/global/${emoji}" alt="${emoji}" title=":${emoji}:">`);
            return;
        }

        // Don't exist
        return result.push(element);
    });

    return result.join(" ");
}

function removeTags(str) {
	if ((str === null) || (str === ''))
		return false;
	else
		str = str.toString();

	// Regular expression to identify HTML tags in
	// the input string. Replacing the identified
	// HTML tag with a null string.
	return str.replace(/(<([^>]+)>)/ig, '');
}

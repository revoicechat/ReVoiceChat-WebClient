const picker = new EmojiPicker();
picker.init().then(async () => initPicker())
    .then(async () => {
        const pickerContainer = document.getElementById('emoji-picker');
        const emojiBtn = document.getElementById('emoji-picker-button');
        emojiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            pickerContainer.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (!pickerContainer.contains(e.target) && e.target !== emojiBtn) {
                pickerContainer.classList.remove('show');
            }
        });

    })

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

async function reloadEmojis() {
    await picker.init()
    await initPicker()
}

async function initPicker() {
    await getEmojisGlobal();
    await initCustomGeneral(picker)
    await initCustomUser(picker)
    await initCustomServer(picker)
    const pickerContainer = document.getElementById('emoji-picker');
    pickerContainer.querySelector('#emoji-picker-content')?.remove();
    pickerContainer.appendChild(picker.create());
    const messageInput = document.getElementById('text-input');
    // Sélection d'emoji
    picker.onEmojiSelect = (emoji) => {
        const cursorPos = messageInput.selectionStart;
        const textBefore = messageInput.value.substring(0, cursorPos);
        const textAfter = messageInput.value.substring(cursorPos);

        messageInput.value = textBefore + emoji + textAfter;
        messageInput.focus();
        messageInput.selectionStart = messageInput.selectionEnd = cursorPos + emoji.length;
    };
}

export {getEmojisGlobal, reloadEmojis}
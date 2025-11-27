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

async function reloadEmojis() {
    await picker.init()
    await initPicker()
}

async function initPicker() {
    await initCustomUser(picker)
    await initCustomServer(picker)
    await initCustomGeneral(picker)
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

export {reloadEmojis}
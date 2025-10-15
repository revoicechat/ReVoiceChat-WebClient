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


const emojiSelect = (emoji) => picker.onEmojiSelect(emoji)

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

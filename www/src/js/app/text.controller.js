import Alert from './utils/alert.js';
import {humanFileSize, sanitizeString, timestampToText} from "../lib/tools.js";
import {i18n} from "../lib/i18n.js";
import MediaServer from "./media/media.server.js";
import CoreServer from "./core/core.server.js";
import Modal from "../component/modal.component.js";
import {emojiPicker} from "./emoji.js";

export default class TextController {
    static MODE_SEND = 0;
    static MODE_EDIT = 1;

    mode = 0;

    /** @type {UserController} */
    #user;
    /** @type {Room} */
    #room;
    /** @type {string|null} */
    #editId;
    #attachmentMaxSize = 0;
    #cachedRooms = {};
    /** @type {MessageRepresentation|null} */
    #repliedMessage = null;
    /** @type {MutationObserver|null} */
    #observer = null;


    /**
     * @param {UserController} user
     * @param {Room} room
     */
    constructor(user, room) {
        this.#user = user;
        this.#room = room;
        this.#observeReply();
    }

    /** Setup observer for replied container */
    #observeReply() {
        const element = document.getElementById("text-reply-message")
        this.#observer?.disconnect();
        this.#observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-message-id') {
                    this.#showRepliedMessage(element);
                }
            }
        });
        this.#observer.observe(element, {attributes: true, attributeFilter: ['data-message-id']});
    }

    /** @param {HTMLElement} element */
    #showRepliedMessage(element) {
        element.innerHTML = ""
        if (this.#repliedMessage) {
            element.classList.remove("hidden");
            const message = document.createElement("div");
            message.innerHTML = `<span data-i18n="message.answer.to">Reply to</span>
                                 <span> </span>
                                 <span style="font-weight: bold">${this.#repliedMessage.user.displayName}</span>`;
            message.style.width = "100%";
            message.style.fontSize = "0.8rem";
            i18n.translatePage(message)
            const closeButton = document.createElement("div");
            closeButton.innerHTML = "<button><revoice-icon-circle-x></revoice-icon-circle-x></button>";
            closeButton.onclick = () => this.#removeRepliedMessage();
            element.appendChild(message);
            element.appendChild(closeButton);
        } else {
            element.classList.add("hidden");
        }
    }

    #removeRepliedMessage() {
        const element = document.getElementById("text-reply-message")
        this.#repliedMessage = null;
        element.dataset.messageId = "";
    }

    attachEvents() {
        const textInput = document.getElementById("text-input");
        textInput.addEventListener('keydown', async (event) => await this.#eventHandler(event));
        textInput.addEventListener('oninput', () => this.oninput(textInput));
        textInput.addEventListener('paste', (event) => this.#pasteHandler(event));

        document.getElementById("attachment-button-add").addEventListener('click', () => this.#addAttachment());
        document.getElementById("attachment-button-remove").addEventListener('click', () => this.#removeAttachment());
        document.getElementById('cache-container').addEventListener("scroll", () => { this.#scroll(this.#cachedRooms[this.#room.id]) });
    }

    #getTextContentElement(roomId) {
        if (!this.#cachedRooms[roomId]) {
            const textContent = document.createElement("div");
            textContent.className = "room-content scrollbar";
            document.getElementById('cache-container').appendChild(textContent);

            let obj = {};
            obj[roomId] = { page: 0, total: 0, content: textContent, loaded: false, scrollTop: null };
            Object.assign(this.#cachedRooms, obj);
        }

        return this.#cachedRooms[roomId]
    }

    async #eventHandler(event) {
        if (event.key === 'Enter') {
            if (event.shiftKey) {
                return;
            }
            event.preventDefault();
            await this.send();
            return;
        }

        if (event.key === 'Escape') {
            document.getElementById("text-input").value = "";
            this.mode = TextController.MODE_SEND;
        }
    }

    #scroll(element) {
        if (!element) return;
        element.scrollTop = document.getElementById('cache-container').scrollTop;
    }

    async #loadMore(element) {
        if (element.content.scrollTop === 0 && element.page !== element.total && element.loaded) {
            const cachedRooms = document.getElementById('cache-container');
            let lastScrollHeight = cachedRooms.scrollHeight;

            /** @type {PageResult<MessageRepresentation>} */
            const result = await CoreServer.fetch(`/room/${this.#room.id}/message?page=${element.page}`, 'GET');
            if (result !== null) {
                element.page = Math.min(result.pageNumber + 1, result.totalPages);

                const invertedSortedResult = [...result.content].sort((a, b) => {
                    return new Date(a.createdDate) + new Date(b.createdDate);
                });

                for (const message of invertedSortedResult) {
                    element.content.prepend(this.create(message));
                }

                cachedRooms.scrollTop = cachedRooms.scrollHeight - lastScrollHeight;
            }
        }
    }

    clearCache() {
        for (const [, room] of Object.entries(this.#cachedRooms)) {
            room.content.remove();
        }
        this.#cachedRooms = {}
    }

    async load(roomId, reload = false) {
        for (const [, room] of Object.entries(this.#cachedRooms)) {
            room.content.classList.add('hidden');
        }

        // Room not loaded in cache yet
        if (!this.#cachedRooms[roomId] || reload) {
            /** @type {PageResult<MessageRepresentation>} */
            const result = await CoreServer.fetch(`/room/${roomId}/message`, 'GET');

            if (result !== null) {
                const element = this.#getTextContentElement(roomId);

                const sortedResult = [...result.content].sort((a, b) => {
                    return new Date(a.createdDate) - new Date(b.createdDate);
                });

                element.content.innerHTML = "";
                for (const message of sortedResult) {
                    element.content.appendChild(this.create(message));
                }

                element.total = result.totalPages;
            }
        }

        const room = this.#cachedRooms[roomId];
        const container = document.getElementById('cache-container');

        if (room.scrollTop == null) {
            room.scrollTop = container.scrollHeight;
        }

        room.content.classList.remove('hidden');
        container.scrollTop = room.scrollTop;
    }

    /** @param {MessageNotification} data */
    message(data) {
        if (data.action === "ADD" && this.#user.id != data.message.user.id) {
            Alert.play('messageNew');
        }

        const message = data.message;
        const room = this.#getTextContentElement(data.message.roomId);
        switch (data.action) {
            case "ADD":
                room.content.appendChild(this.create(message));
                if (!document.getElementById(data.message.roomId).classList.contains('active')) {
                    document.getElementById(`room-extension-dot-${data.message.roomId}`).classList.remove('hidden');
                }
                break;
            case "MODIFY":
                document.getElementById(message.id).replaceWith(this.#createContent(message));
                document.getElementById(`header-message-${message.id}`).replaceWith(this.#createHeader(message));
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

    #addAttachment() {
        const fileInput = document.getElementById("text-attachment");
        fileInput.click();
        document.getElementById("text-attachment-div").classList.remove('hidden');
        document.getElementById("text-input").focus()
    }

    #removeAttachment() {
        const fileInput = document.getElementById("text-attachment");
        fileInput.value = "";
        document.getElementById("text-attachment-div").classList.add('hidden');
        document.getElementById("text-input").focus()
    }

    #pasteHandler(event) {
        const items = event.clipboardData?.items;
        if (!items) return;

        const fileInput = document.getElementById("text-attachment");
        const dataTransfer = new DataTransfer();

        // Keep existing files
        for (const existingFile of fileInput.files) {
            dataTransfer.items.add(existingFile);
        }

        let hasFile = false
        for (const item of items) {
            // Handle images or files
            if (item.kind === "file") {
                const file = item.getAsFile();
                if (file) {
                    if (file.name === "image.png") { // it's a screenshot, rename needed
                        const copy = new File([file], `screenshot-${Date.now()}.png`, {
                            type: file.type,
                            lastModified: file.lastModified
                        });
                        dataTransfer.items.add(copy);
                    } else {
                        dataTransfer.items.add(file);
                    }
                    hasFile = true;
                }
            }
        }

        fileInput.files = dataTransfer.files;

        // Prevent default paste if files were detected
        if (hasFile) {
            document.getElementById("text-attachment-div").classList.remove('hidden');
            event.preventDefault();
        }
    }

    async send() {
        const attachments_input = document.getElementById("text-attachment");
        let textInput = sanitizeString(document.getElementById('text-input').value);

        if ((textInput == "" || textInput == null) && !attachments_input) {
            return;
        }

        const data = {
            text: textInput,
            answerTo: this.#repliedMessage?.id,
            medias: []
        }

        // Attachments
        const attachments = [];
        if (attachments_input && this.mode === TextController.MODE_SEND) {
            for (const element of attachments_input.files) {
                if (element.size < this.#attachmentMaxSize) {
                    data.medias.push({ name: element.name });
                    attachments[element.name] = element;
                }
                else {
                    await Modal.toggle({
                        icon: "error",
                        title: i18n.translateOne("attachement.error.size.title"),
                        html: i18n.translateOne("attachement.error.size.body", [element.name, humanFileSize(this.#attachmentMaxSize), humanFileSize(element.size)]),
                        showCancelButton: false,
                        focusConfirm: false,
                    });
                    return;
                }
            }
        }

        let result = await this.#sendMessage(data);
        if (result) {
            await this.#sendAttachements(result, attachments);

            // Clean file input
            this.#removeAttachment();
            this.#removeRepliedMessage();

            // Clean text input
            const textarea = document.getElementById("text-input");
            textarea.value = "";
            textarea.style.height = "auto";

            // Default mode
            this.mode = TextController.MODE_SEND;
            this.#editId = null;
            return;
        }

        await Modal.toggleError(
            i18n.translateOne("attachement.error.title"),
            i18n.translateOne("attachement.error.body")
        );
    }

    /**
     * @param data
     * @returns {Promise<MessageRepresentation|null>}
     */
    async #sendMessage(data) {
        let result = null;
        switch (this.mode) {
            case TextController.MODE_SEND:
                result = await CoreServer.fetch(`/room/${this.#room.id}/message`, 'PUT', data);
                break;

            case TextController.MODE_EDIT:
                result = await CoreServer.fetch(`/message/${this.#editId}`, 'PATCH', data);
                break;

            default:
                console.error('Invalid mode');
                break;
        }
        return result;
    }

    async #sendAttachements(result, attachments) {
        if (this.mode === TextController.MODE_SEND) {
            for (const media of result.medias) {
                const formData = new FormData();
                formData.append("file", attachments[media.name]);
                await MediaServer.fetch(`/attachments/${media.id}`, 'POST', formData, false);
            }
        }
    }

    oninput(input) {
        input.style.height = "auto";
        input.style.height = input.scrollHeight + "px";
        if (input.value == "") {
            this.mode = TextController.MODE_SEND;
            this.#editId = null;
        }
    }

    /**
     * @param {MessageRepresentation} messageData
     */
    create(messageData) {
        const CONTAINER = document.createElement('div');
        CONTAINER.className = `message-container-message`;
        if (messageData.answeredTo) {
            CONTAINER.appendChild(this.#createAnswerHeader(messageData));
            CONTAINER.appendChild(this.#createHeader(messageData, false));
        } else {
            CONTAINER.appendChild(this.#createHeader(messageData, true));
        }
        CONTAINER.appendChild(this.#createContent(messageData));
        const MESSAGE = document.createElement('div');
        MESSAGE.id = `container-${messageData.id}`;
        MESSAGE.className = "message-container";
        if (RVC.userSettings().messageSetting === "default") {
            this.#addPicture(messageData, MESSAGE);
        }
        MESSAGE.appendChild(CONTAINER);
        return MESSAGE;
    }

    /**
     * Create a display for the answered message
     * @param {MessageRepresentation} messageData
     * @returns {HTMLElement}
     */
    #createAnswerHeader(messageData) {
        const answeredTo = messageData.answeredTo;
        const answerDiv = document.createElement('div');
        answerDiv.className = "message-answer-to";

        const icon = document.createElement('span');
        icon.innerHTML = '<revoice-icon-answer></revoice-icon-answer>';
        icon.style.marginRight = "4px";

        const label = document.createElement('span');
        label.dataset.i18n = 'message.answer.to';
        label.textContent = 'Reply to';

        const messagePreview = document.createElement('div');
        messagePreview.className = "message-answer-preview";

        // Truncate text if too long
        messagePreview.textContent = answeredTo.text.length > 50
          ? answeredTo.text.substring(0, 50) + '...'
          : answeredTo.text;

        if (answeredTo.hasMedias) {
            const mediaIndicator = document.createElement('span');
            mediaIndicator.innerHTML = ' 📎';
            messagePreview.appendChild(mediaIndicator);
        }

        answerDiv.appendChild(icon);
        answerDiv.appendChild(label);
        answerDiv.appendChild(messagePreview);

        // Click handler to scroll to original message
        answerDiv.style.cursor = "pointer";
        answerDiv.onclick = () => {
            const originalMessage = document.getElementById(`container-${answeredTo.id}`);
            if (originalMessage) {
                originalMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                originalMessage.style.backgroundColor = 'var(--highlight-color, rgba(59, 130, 246, 0.1))';
                setTimeout(() => {
                    originalMessage.style.backgroundColor = '';
                }, 2000);
            }
        };

        const answerHolder= document.createElement("div");
        answerHolder.appendChild(answerDiv)
        answerHolder.style.display = "flex";
        answerHolder.style.alignContent = "certer";
        const CONTEXT_MENU = this.#createContextMenu(messageData)
        if (CONTEXT_MENU) {
            answerHolder.appendChild(CONTEXT_MENU);
        }

        i18n.translatePage(answerHolder);
        return answerHolder;
    }

    /**
     * @param {MessageRepresentation} messageData
     * @param {boolean} withButton
     */
    #createHeader(messageData, withButton = true) {
        const header = document.createElement('div');
        header.className = "message-header";
        header.id = `header-message-${messageData.id}`;
        const title = document.createElement('h3')
        title.className = "message-owner"
        title.innerHTML = `<span>${messageData.user.displayName}</span>
                           <span class="message-timestamp">${timestampToText(messageData.createdDate)}</span>
                           ${messageData.updatedDate ? '<span class="message-timestamp" data-i18n="message.edit">(edit)</span>' : ''}`;
        header.appendChild(title);
        if (withButton) {
            const CONTEXT_MENU = this.#createContextMenu(messageData)
            if (CONTEXT_MENU) {
                header.appendChild(CONTEXT_MENU);
            }
        }
        i18n.translatePage(header);
        return header
    }

    #addPicture(messageData, MESSAGE) {
        const picture = document.createElement('img');
        picture.src = MediaServer.profiles(messageData.user.id);
        picture.alt = "PFP"
        picture.className = "icon ring-2"
        picture.dataset.id = messageData.user.id
        MESSAGE.appendChild(picture);
    }

    /** @param {MessageRepresentation} messageData */
    #createContent(messageData) {
        const CONTENT = document.createElement('revoice-message');
        CONTENT.id = messageData.id;
        CONTENT.innerHTML = `
            <script type="application/json" slot="medias">
                ${JSON.stringify(messageData.medias)}
            </script>
            <script type="text/markdown" slot="content">
                ${messageData.text}
            </script>
            <script type="application/json" slot="emotes">
                ${JSON.stringify(messageData.emotes)}
            </script>
            <script type="application/json" slot="reactions">
                ${JSON.stringify(messageData.reactions)}
            </script>
        `;
        return CONTENT;
    }

    /** @param {MessageRepresentation} repliedMessage */
    #reply(repliedMessage) {
        this.#repliedMessage = repliedMessage;
        document.getElementById("text-reply-message").dataset.messageId = repliedMessage.id;
        document.getElementById("text-input").focus();
    }

    async #edit(id) {
        const result = await CoreServer.fetch(`/message/${id}`, 'GET');

        if (result) {
            const textarea = document.getElementById("text-input");
            textarea.value = result.text;
            textarea.style.height = "auto";
            textarea.style.height = textarea.scrollHeight + "px";
            this.mode = TextController.MODE_EDIT;
            this.#editId = id;
            document.getElementById("text-input").focus();
        }
    }

    async #delete(id) {
        await CoreServer.fetch(`/message/${id}`, 'DELETE');
    }

    /**
     * @param {MessageRepresentation} messageData
     * @return {HTMLElement|null}
     */
    #createContextMenu(messageData) {

        const DIV = document.createElement('div');
        DIV.className = "message-context-menu";

        const ANSWER = document.createElement('div');
        ANSWER.className = "icon";
        ANSWER.innerHTML = "<revoice-icon-answer></revoice-icon-answer>";
        ANSWER.onclick = () => this.#reply(messageData);
        DIV.appendChild(ANSWER);

        const REACTIONS = document.createElement('div');
        REACTIONS.className = "icon";
        REACTIONS.innerHTML = "<revoice-icon-emoji></revoice-icon-emoji>";
        REACTIONS.addEventListener('click', (e) => {
            e.stopPropagation();
            emojiPicker.onEmojiSelect = (emoji) => {
                void CoreServer.fetch(`/message/${messageData.id}/reaction/${emoji.dataset.id}`, 'POST');
                emojiPicker.hide();
            };
            emojiPicker.show(e.clientX, e.clientY);
        });
        DIV.appendChild(REACTIONS);

        if (messageData.user.id === this.#user.id) {
            const EDIT = document.createElement('div');
            EDIT.className = "icon";
            EDIT.innerHTML = "<revoice-icon-pencil></revoice-icon-pencil>";
            EDIT.onclick = () => this.#edit(messageData.id);

            const DELETE = document.createElement('div');
            DELETE.className = "icon";
            DELETE.innerHTML = "<revoice-icon-trash></revoice-icon-trash>";
            DELETE.onclick = () => this.#delete(messageData.id);

            DIV.appendChild(EDIT);
            DIV.appendChild(DELETE);
        }

        return DIV
    }

    async getAttachmentMaxSize() {
        /** @type {MediaSettings} */
        const response = await MediaServer.fetch('/maxfilesize');
        if (response) {
            this.#attachmentMaxSize = response.maxFileSize;
        }
    }
}
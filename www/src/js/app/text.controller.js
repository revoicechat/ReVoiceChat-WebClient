import Alert from './utils/alert.js';
import { humanFileSize, sanitizeString, timestampToText } from "../lib/tools.js";
import { i18n } from "../lib/i18n.js";
import MediaServer from "./media/media.server.js";
import CoreServer from "./core/core.server.js";
import Modal from "../component/modal.component.js";
import { emojiPicker } from "./emoji.js";

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

    #cacheContainerElement = null;
    #textReplyMessageElement = null;
    #textInputElement = null;
    #textAttachmentElement = null;
    #textAttachmentDivElement = null;

    /**
     * @param {UserController} user
     * @param {Room} room
     */
    constructor(user, room) {
        this.#user = user;
        this.#room = room;
        this.#cacheContainerElement = document.getElementById('cache-container');
        this.#textReplyMessageElement = document.getElementById("text-reply-message");
        this.#textInputElement = document.getElementById("text-input");
        this.#textAttachmentElement = document.getElementById("text-attachment");
        this.#textAttachmentDivElement = document.getElementById("text-attachment-div");
        this.#observeReply();
    }

    /** Setup observer for replied container */
    #observeReply() {
        this.#observer?.disconnect();
        this.#observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-message-id') {
                    this.#showRepliedMessage(this.#textReplyMessageElement);
                }
            }
        });
        this.#observer.observe(this.#textReplyMessageElement, { attributes: true, attributeFilter: ['data-message-id'] });
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
        this.#repliedMessage = null;
        this.#textReplyMessageElement.dataset.messageId = "";
    }

    attachEvents() {
        this.#textInputElement.addEventListener('keydown', async (event) => await this.#eventHandler(event));
        this.#textInputElement.addEventListener('oninput', () => this.oninput(this.#textInputElement));
        this.#textInputElement.addEventListener('paste', (event) => this.#pasteHandler(event));

        document.getElementById("attachment-button-add").addEventListener('click', () => this.#addAttachment());
        document.getElementById("attachment-button-remove").addEventListener('click', () => this.#removeAttachment());

        this.#cacheContainerElement.addEventListener("scroll", () => {
            const element = this.#cachedRooms[this.#room.id];
            if (element) {
                element.scrollTop = this.#cacheContainerElement.scrollTop;
            }
            this.#loadMore(element);
        });
    }

    #getTextContentElement(roomId) {
        if (!this.#cachedRooms[roomId]) {
            const textContent = document.createElement("div");
            textContent.className = "room-content scrollbar";
            this.#cacheContainerElement.appendChild(textContent);

            let obj = {};
            obj[roomId] = { content: textContent, scrollTop: null, firstMessageId: null };
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
            this.#textInputElement.value = "";
            this.mode = TextController.MODE_SEND;
        }
    }

    #isScrollAtBottom(element) {
        return Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 1;
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
                    if (!element.firstMessageId) {
                        element.firstMessageId = message.id;
                    }
                    element.content.appendChild(this.create(message));
                }

                element.total = result.totalPages;
            }
        }

        const room = this.#cachedRooms[roomId];

        if (room.scrollTop == null) {
            room.scrollTop = this.#cacheContainerElement.scrollHeight;
        }

        room.content.classList.remove('hidden');
        this.#cacheContainerElement.scrollTop = room.scrollTop;
    }

    async #loadMore(element) {
        if (element && element.scrollTop === 0) {
            let lastScrollHeight = this.#cacheContainerElement.scrollHeight;

            /** @type {PageResult<MessageRepresentation>} */
            const result = await CoreServer.fetch(`/room/${this.#room.id}/message?lastMessage=${element.firstMessageId}`, 'GET');
            if (result !== null) {
                const invertedSortedResult = [...result.content].sort((a, b) => {
                    return new Date(a.createdDate) + new Date(b.createdDate);
                });

                for (const message of invertedSortedResult) {
                    element.content.prepend(this.create(message));
                    element.firstMessageId = message.id;
                }

                this.#cacheContainerElement.scrollTop = this.#cacheContainerElement.scrollHeight - lastScrollHeight;
            }
        }
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
                const isAtBottom = this.#isScrollAtBottom(this.#cacheContainerElement);

                // Add message
                room.content.appendChild(this.create(message));

                // Notification dot
                if (this.#room.id != data.message.roomId) {
                    document.getElementById(`room-extension-dot-${data.message.roomId}`).classList.remove('hidden');
                }

                // Scroll auto
                if (isAtBottom && this.#cacheContainerElement.scrollTop < this.#cacheContainerElement.scrollHeight) {
                    this.#cacheContainerElement.scrollTop = this.#cacheContainerElement.scrollHeight;
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
        this.#textAttachmentElement.click();
        this.#textAttachmentDivElement.classList.remove('hidden');
        this.#textInputElement.focus()
    }

    #removeAttachment() {
        this.#textAttachmentElement.value = "";
        this.#textAttachmentDivElement.classList.add('hidden');
        this.#textInputElement.focus()
    }

    #pasteHandler(event) {
        const items = event.clipboardData?.items;
        if (!items) return;

        const dataTransfer = new DataTransfer();

        // Keep existing files
        for (const existingFile of this.#textAttachmentElement.files) {
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

        this.#textAttachmentElement.files = dataTransfer.files;

        // Prevent default paste if files were detected
        if (hasFile) {
            this.#textAttachmentDivElement.classList.remove('hidden');
            event.preventDefault();
        }
    }

    async send() {
        let textInput = sanitizeString(this.#textInputElement.value);

        if ((textInput == "" || textInput == null) && !this.#textAttachmentElement) {
            return;
        }

        const data = {
            text: textInput,
            answerTo: this.#repliedMessage?.id,
            medias: []
        }

        // Attachments
        const attachments = [];
        if (this.#textAttachmentElement && this.mode === TextController.MODE_SEND) {
            for (const element of this.#textAttachmentElement.files) {
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
            this.#textInputElement.value = "";
            this.#textInputElement.style.height = "auto";

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

        const answerHolder = document.createElement("div");
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
        this.#textReplyMessageElement.dataset.messageId = repliedMessage.id;
        this.#textInputElement.focus();
    }

    async #edit(id) {
        const result = await CoreServer.fetch(`/message/${id}`, 'GET');

        if (result) {
            this.mode = TextController.MODE_EDIT;
            this.#editId = id;
            this.#textInputElement.value = result.text;
            this.#textInputElement.style.height = "auto";
            this.#textInputElement.style.height = this.#textInputElement.scrollHeight + "px";
            this.#textInputElement.focus();
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
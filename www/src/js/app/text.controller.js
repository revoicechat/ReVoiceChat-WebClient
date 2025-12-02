import Swal from '../lib/sweetalert2.esm.all.min.js';
import {sanitizeString, SwalCustomClass, timestampToText, humanFileSize} from "../lib/tools.js";
import {i18n} from "../lib/i18n.js";

export default class TextController {
    static MODE_SEND = 0;
    static MODE_EDIT = 1;

    mode = 0;

    /** @type {Alert} */
    #alert;
    /** @type {UserController} */
    #user;
    /** @type {Fetcher} */
    #fetcher;
    /** @type {Room} */
    #room;
    /** @type {string|null} */
    #editId;
    #attachmentMaxSize = 0;

    /**
     * @param {Fetcher} fetcher
     * @param {Alert} alert
     * @param {UserController} user
     * @param {Room} room
     */
    constructor(fetcher, alert, user, room) {
        this.#fetcher = fetcher;
        this.#alert = alert;
        this.#user = user;
        this.#room = room;
        this.#getAttachmentMaxSize();
    }

    attachEvents() {
        const textInput = document.getElementById("text-input");
        textInput.addEventListener('keydown', async (event) => await this.#eventHandler(event));
        textInput.addEventListener('oninput', () => this.oninput(textInput));

        document.getElementById("attachment-button-add").addEventListener('click', () => this.#addAttachment());
        document.getElementById("attachment-button-remove").addEventListener('click', () => this.#removeAttachment());
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

    async getAllFrom(roomId) {
        /** @type {PageResult<MessageRepresentation>} */
        const result = await this.#fetcher.fetchCore(`/room/${roomId}/message`, 'GET');

        if (result !== null) {
            const ROOM = document.getElementById("text-content");

            const sortedResult = [...result.content].sort((a, b) => {
                return new Date(a.createdDate) - new Date(b.createdDate);
            });

            ROOM.innerHTML = "";
            for (const message of sortedResult) {
                ROOM.appendChild(this.#create(message));
            }

            ROOM.scrollTop = ROOM.scrollHeight;
        }
    }

    /** @param {MessageNotification} data */
    message(data) {
        if (data.action === "ADD" && this.#user.id != data.message.user.id) {
            this.#alert.play('messageNew');
        }

        if (data.message.roomId !== this.#room.id) {
            return;
        }

        const message = data.message;
        const room = document.getElementById("text-content");
        switch (data.action) {
            case "ADD":
                room.appendChild(this.#create(message));
                break;
            case "MODIFY":
                document.getElementById(message.id).replaceWith(this.#createContent(message));
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

    async send() {
        let result = null;

        const attachments_input = document.getElementById("text-attachment");
        let textInput = sanitizeString(document.getElementById('text-input').value);

        if ((textInput == "" || textInput == null) && !attachments_input) {
            return;
        }

        const data = {
            text: textInput,
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
                    await Swal.fire({
                        icon: "error",
                        title: i18n.translateOne("attachement.error.size.title"),
                        html: i18n.translateOne("attachement.error.size.body", [element.name, humanFileSize(this.#attachmentMaxSize), humanFileSize(element.size)]),
                        animation: true,
                        customClass: {
                            title: "swalTitle",
                            popup: "swalPopup",
                            confirmButton: "swalConfirm",
                        },
                        showCancelButton: false,
                        focusConfirm: false,
                        confirmButtonText: "OK",
                    });
                    return;
                }
            }
        }

        switch (this.mode) {
            case TextController.MODE_SEND:
                result = await this.#fetcher.fetchCore(`/room/${this.#room.id}/message`, 'PUT', data);
                break;

            case TextController.MODE_EDIT:
                result = await this.#fetcher.fetchCore(`/message/${this.#editId}`, 'PATCH', data);
                break;

            default:
                console.error('Invalid mode');
                break;
        }

        if (result) {

            // Send attachments
            if (this.mode === TextController.MODE_SEND) {
                for (const media of result.medias) {
                    const formData = new FormData();
                    formData.append("file", attachments[media.name]);
                    await this.#fetcher.fetchMedia(`/attachments/${media.id}`, 'POST', formData, false);
                }
            }

            // Clean file input
            this.#removeAttachment();

            // Clean text input
            const textarea = document.getElementById("text-input");
            textarea.value = "";
            textarea.style.height = "auto";

            // Default mode
            this.mode = TextController.MODE_SEND;
            this.#editId = null;
            return;
        }

        Swal.fire({
            icon: 'error',
            title: i18n.translateOne("attachement.error.title"),
            text: i18n.translateOne("attachement.error.body"),
            animation: false,
            customClass: SwalCustomClass,
            showCancelButton: false,
            confirmButtonText: "OK",
            allowOutsideClick: false,
        });
    }

    oninput(input) {
        input.style.height = "auto";
        input.style.height = input.scrollHeight + "px";
        if (input.value == "") {
            this.mode = TextController.MODE_SEND;
            this.#editId = null;
        }
    }

    /** @param {MessageRepresentation} messageData */
    #create(messageData) {
        const CONTAINER = document.createElement('div');
        CONTAINER.id = `container-${messageData.id}`;
        CONTAINER.className = "message-container";

        const HEADER = document.createElement('div');
        HEADER.className = "message-header";
        HEADER.innerHTML = `<h3 class="message-owner">${messageData.user.displayName} <span class="message-timestamp">${timestampToText(messageData.createdDate)}</span></h3>`;

        const CONTEXT_MENU = this.#createContextMenu(messageData)
        if (CONTEXT_MENU) {
            HEADER.appendChild(CONTEXT_MENU);
        }

        CONTAINER.appendChild(HEADER);

        CONTAINER.appendChild(this.#createContent(messageData));
        return CONTAINER;
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
        `;
        return CONTENT;
    }

    async #edit(id) {
        const result = await this.#fetcher.fetchCore(`/message/${id}`, 'GET');

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
        await this.#fetcher.fetchCore(`/message/${id}`, 'DELETE');
    }

    /**
     * @param {MessageRepresentation} messageData
     * @return {HTMLElement|null}
     */
    #createContextMenu(messageData) {
        if (messageData.user.id != this.#user.id) {
            return null;
        }

        const DIV = document.createElement('div');
        DIV.className = "message-context-menu";

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

        return DIV
    }

    async #getAttachmentMaxSize() {
        /** @type {MediaSettings} */
        const response = await this.#fetcher.fetchMedia('/maxfilesize');
        if (response) {
            this.#attachmentMaxSize = response.maxFileSize;
        }
    }
}
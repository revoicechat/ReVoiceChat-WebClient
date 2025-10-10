class EmojiManager extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.emojis = [];
        this.emojiImages = {};
        this.currentEditId = null;
        this.previewImage = null;
    }

    connectedCallback() {
        this.path = this.getAttribute("path")
        this.render();
        this.setupEventListeners();
        this.loadEmojisFromSlot();
        this.setupSlotObserver();
    }

    setupSlotObserver() {
        // Observer to detect slot changes
        const slot = this.shadowRoot.querySelector('slot');

        slot.addEventListener('slotchange', () => {
            this.loadEmojisFromSlot();
        });

        // MutationObserver to detect changes in slot content
        const observer = new MutationObserver(() => {
            this.loadEmojisFromSlot();
        });

        observer.observe(this, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    loadEmojisFromSlot() {
        const slotContent = this.querySelector('[slot="emojis-data"]');
        if (slotContent) {
            try {
                const data = JSON.parse(slotContent.textContent.trim());
                if (Array.isArray(data)) {
                    this.emojis = data;
                    this.updateEmojiList();
                }
            } catch (e) {
                console.error('Error parsing emojis JSON:', e);
            }
        }
    }

    setupEventListeners() {
        const addForm = this.shadowRoot.getElementById('addForm');
        const editForm = this.shadowRoot.getElementById('editForm');
        const cancelBtn = this.shadowRoot.getElementById('cancelEdit');
        const modal = this.shadowRoot.getElementById('editModal');
        const addFileInput = this.shadowRoot.getElementById('emojiFile');
        const editFileInput = this.shadowRoot.getElementById('editEmojiFile');

        addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addEmoji();
        });

        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEdit();
        });

        cancelBtn.addEventListener('click', () => {
            this.closeModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target.id === 'editModal') {
                this.closeModal();
            }
        });

        // Preview for add form
        addFileInput.addEventListener('change', (e) => {
            this.handleFilePreview(e.target.files[0], 'addPreview');
        });

        // Preview for edit form
        editFileInput.addEventListener('change', (e) => {
            this.handleFilePreview(e.target.files[0], 'editPreview');
        });
    }

    handleFilePreview(file, previewId) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = this.shadowRoot.getElementById(previewId);
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            preview.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }

    validateName(name) {
        if (!name.trim()) {
            return "Name is required";
        }
        if (/\s/.test(name)) {
            return "Name must not contain spaces";
        }
        return null;
    }

    async addEmoji() {
        const fileInput = this.shadowRoot.getElementById('emojiFile');
        const nameInput = this.shadowRoot.getElementById('emojiName');
        const keywordsInput = this.shadowRoot.getElementById('emojiKeywords');

        // Reset errors
        this.shadowRoot.getElementById('fileError').textContent = '';
        this.shadowRoot.getElementById('nameError').textContent = '';

        // Validate
        const nameError = this.validateName(nameInput.value);
        if (nameError) {
            this.shadowRoot.getElementById('nameError').textContent = nameError;
            return;
        }

        if (!fileInput.files[0]) {
            this.shadowRoot.getElementById('fileError').textContent = "Please select an image";
            return;
        }

        // Check if name already exists
        if (this.emojis.some(e => e.name === nameInput.value.trim())) {
            this.shadowRoot.getElementById('nameError').textContent = "This name already exists";
            return;
        }

        // Read file
        const file = fileInput.files[0];
        const keywords = keywordsInput.value
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);

        try {
            const emojiData = await fetchCoreAPI(`/emote/${this.path}`, 'PUT', {
                    fileName: file.name,
                    content: nameInput.value.trim(),
                    keywords: keywords
                }
            );
            const formData = new FormData();
            formData.append('file', file);
            await fetch(`${global.url.media}/emojis/${emojiData.id}`, {
                method: "POST",
                signal: AbortSignal.timeout(5000),
                headers: {
                    'Authorization': `Bearer ${global.jwtToken}`
                },
                body: formData
            });

            // Temporary: Store image locally until API is integrated
            const reader = new FileReader();
            reader.onload = (e) => {
                this.emojiImages[emojiData.id] = e.target.result;
                this.emojis.push(emojiData);

                // Dispatch custom event
                this.dispatchEvent(new CustomEvent('emoji-added', {
                    detail: { emoji: emojiData },
                    bubbles: true,
                    composed: true
                }));

                // Reset form
                fileInput.value = '';
                nameInput.value = '';
                keywordsInput.value = '';
                this.shadowRoot.getElementById('addPreview').style.display = 'none';
                this.shadowRoot.getElementById('addPreview').innerHTML = '';

                this.updateEmojiList();
            };
            reader.readAsDataURL(file);

        } catch (error) {
            console.error('Error adding emoji:', error);
            this.shadowRoot.getElementById('fileError').textContent = 'Failed to add emoji';
        }
    }

    async deleteEmoji(id) {
        Swal.fire({
            title: `Delete emote '${id}'`,
            animation: false,
            customClass: {
                title: "swalTitle",
                popup: "swalPopup",
                cancelButton: "swalConfirm",
                confirmButton: "swalCancel", // Swapped on purpose !
            },
            showCancelButton: true,
            focusCancel: true,
            confirmButtonText: "Delete",
            allowOutsideClick: false,
        }).then(async (result) => {
            if (result.value) {
                try {
                    await fetchCoreAPI(`/emote/${id}`, 'DELETE');

                    // Temporary: Delete locally until API is integrated
                    this.emojis = this.emojis.filter(e => e.id !== id);
                    delete this.emojiImages[id];

                    // Dispatch custom event
                    this.dispatchEvent(new CustomEvent('emoji-deleted', {
                        detail: { emoji },
                        bubbles: true,
                        composed: true
                    }));

                    this.updateEmojiList();
                } catch (error) {
                    console.error('Error deleting emoji:', error);
                    alert('Failed to delete emoji');
                }
            }
        });
    }

    openEditModal(id) {
        const emoji = this.emojis.find(e => e.id === id);
        if (!emoji) return;

        this.currentEditId = id;
        this.shadowRoot.getElementById('editName').value = emoji.name;
        this.shadowRoot.getElementById('editKeywords').value = emoji.keywords.join(', ');
        this.shadowRoot.getElementById('editNameError').textContent = '';
        this.shadowRoot.getElementById('editEmojiFile').value = '';

        // Show current image
        const editPreview = this.shadowRoot.getElementById('editPreview');
        if (this.emojiImages[id]) {
            editPreview.innerHTML = `<img src="${this.emojiImages[id]}" alt="${emoji.name}">`;
            editPreview.style.display = 'flex';
        } else {
            editPreview.innerHTML = '<span style="font-size: 2rem;">🎨</span>';
            editPreview.style.display = 'flex';
        }

        this.shadowRoot.getElementById('editModal').classList.add('active');
    }

    closeModal() {
        this.shadowRoot.getElementById('editModal').classList.remove('active');
        this.currentEditId = null;
    }

    saveEdit() {
        const nameInput = this.shadowRoot.getElementById('editName');
        const keywordsInput = this.shadowRoot.getElementById('editKeywords');
        const fileInput = this.shadowRoot.getElementById('editEmojiFile');

        this.shadowRoot.getElementById('editNameError').textContent = '';

        const nameError = this.validateName(nameInput.value);
        if (nameError) {
            this.shadowRoot.getElementById('editNameError').textContent = nameError;
            return;
        }

        // Check if name already exists (excluding current emoji)
        if (this.emojis.some(e => e.name === nameInput.value.trim() && e.id !== this.currentEditId)) {
            this.shadowRoot.getElementById('editNameError').textContent = "This name already exists";
            return;
        }

        const emoji = this.emojis.find(e => e.id === this.currentEditId);
        if (emoji) {
            const oldName = emoji.name;
            const keywords = keywordsInput.value
                .split(',')
                .map(k => k.trim())
                .filter(k => k.length > 0);

            const updateEmoji = async () => {
                try {
                    await fetchCoreAPI(`/emote/${this.currentEditId}`, 'PATCH', {
                        fileName: fileInput.files[0]?.name,
                        content: nameInput.value.trim(),
                        keywords: keywords
                    });

                    // Temporary: Update locally until API is integrated
                    emoji.name = nameInput.value.trim();
                    emoji.keywords = keywords;

                    if (fileInput.files[0]) {
                        const formData = new FormData();
                        formData.append('file', fileInput.files[0]);
                        await fetch(`${global.url.media}/emojis/${emojiData.id}`, {
                            method: "POST",
                            signal: AbortSignal.timeout(5000),
                            headers: {
                                'Authorization': `Bearer ${global.jwtToken}`
                            },
                            body: formData
                        });

                        // Temporary: Store image locally until API is integrated
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            this.emojiImages[this.currentEditId] = e.target.result;

                            // Dispatch custom event
                            this.dispatchEvent(new CustomEvent('emoji-updated', {
                                detail: { emoji, oldName },
                                bubbles: true,
                                composed: true
                            }));

                            this.closeModal();
                            this.updateEmojiList();
                        };
                        reader.readAsDataURL(fileInput.files[0]);
                    } else {
                        // Dispatch custom event
                        this.dispatchEvent(new CustomEvent('emoji-updated', {
                            detail: { emoji, oldName },
                            bubbles: true,
                            composed: true
                        }));

                        this.closeModal();
                        this.updateEmojiList();
                    }
                } catch (error) {
                    console.error('Error updating emoji:', error);
                    this.shadowRoot.getElementById('editNameError').textContent = 'Failed to update emoji';
                }
            };

            updateEmoji();
        }
    }

    updateEmojiList() {
        const grid = this.shadowRoot.getElementById('emojiGrid');
        const count = this.shadowRoot.getElementById('emojiCount');

        count.textContent = this.emojis.length;

        if (this.emojis.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <revoice-icon-emoji></revoice-icon-emoji>
                    <h3>No emojis yet</h3>
                    <p>Add one above!</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.emojis.map(emoji => `
            <div class="config-item">
                <div class="emoji-header">
                    <div class="emoji-preview">
                        <img src="${global.url.media}/emojis/${emoji.id}" alt="${emoji.name}">
                    </div>
                    <div class="emoji-info">
                        <div class="emoji-name">:${emoji.name}:</div>
                        <div class="emoji-keywords">${emoji.keywords.length > 0 ? emoji.keywords.join(', ') : '—'}</div>
                    </div>
                </div>
                <div class="emoji-actions">
                    <button class="emote-list-button btn-secondary btn-small" data-action="edit" data-id="${emoji.id}">
                        <revoice-icon-pencil></revoice-icon-pencil> Edit
                    </button>
                    <button class="emote-list-button btn-danger btn-small" data-action="delete" data-id="${emoji.id}">
                        <revoice-icon-trash></revoice-icon-trash> Delete
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners for buttons
        grid.querySelectorAll('button[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => this.openEditModal(btn.dataset.id));
        });

        grid.querySelectorAll('button[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => this.deleteEmoji(btn.dataset.id));
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    --pri-bg-color: #121214;
                    --sec-bg-color: #1a1a1e;
                    --ter-bg-color: #202024;
                    --qua-bg-color: #43434d;
                    --pri-bd-color: #43434d;
                    --sec-bd-color: #ffffff;
                    --pri-text-color: #ffffff;
                    --pri-placeholder-color: #9ca3af;
                    --pri-active-color: #2c2c30;
                    --pri-hover-color: #242427;
                    --sec-hover-color: #43434d;
                    --pri-button-bg-color: #5E8C61;
                    --pri-button-hover-color: #3D6B47;
                    --pri-button-text-color: var(--pri-text-color);
                    --sec-button-bg-color: #00000000;
                    --sec-button-hover-color: #2c2c30;
                    --ter-button-bg-color: #a22121;
                    --ter-button-hover-color: #731818;
                }

                * {
                    font-family: sans-serif;
                    user-select: none;
                    box-sizing: border-box;
                }

                button {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                    border-radius: 0.25rem;
                    padding: 0.5rem 1rem;
                    font-weight: 700;
                    text-align: center;
                    border: none;
                }

                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    color: var(--pri-text-color);
                }

                .header {
                    margin-bottom: 2rem;
                }

                .header h1 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin-bottom: 0.5rem;
                }

                .header p {
                    color: var(--pri-placeholder-color);
                    font-size: 0.875rem;
                }

                .add-section {
                    background-color: var(--sec-bg-color);
                    border: 1px solid var(--pri-bd-color);
                    border-radius: 0.25rem;
                    padding: 1.5rem;
                    margin-bottom: 2rem;
                }

                .add-section h2 {
                    font-size: 1rem;
                    font-weight: 800;
                    margin-bottom: 1rem;
                }

                .add-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .form-row {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .form-row-with-preview {
                    display: flex;
                    gap: 1rem;
                    align-items: flex-start;
                }

                .form-group {
                    flex: 1;
                    min-width: 250px;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 800;
                    color: var(--pri-text-color);
                }

                .form-group input[type="text"],
                .form-group input[type="file"] {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border: 1px solid var(--pri-bd-color);
                    border-radius: 0.25rem;
                    background-color: var(--ter-bg-color);
                    color: var(--pri-text-color);
                    outline: 2px solid transparent;
                    outline-offset: 2px;
                }

                .form-group input::placeholder {
                    color: var(--pri-placeholder-color);
                }

                .form-group input:focus {
                    border-color: var(--pri-button-bg-color);
                }

                .preview-container {
                    display: none;
                    width: 6rem;
                    height: 6rem;
                    background-color: var(--qua-bg-color);
                    border-radius: 0.25rem;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    flex-shrink: 0;
                    border: 2px solid var(--pri-bd-color);
                }

                .preview-container img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                }

                .btn-primary {
                    background-color: var(--pri-button-bg-color);
                    color: var(--pri-button-text-color);
                }

                .btn-primary:hover {
                    background-color: var(--pri-button-hover-color);
                }

                .btn-secondary {
                    background-color: var(--sec-button-bg-color);
                    color: var(--pri-text-color);
                }

                .btn-secondary:hover {
                    background-color: var(--sec-button-hover-color);
                }

                .btn-danger {
                    background-color: var(--ter-button-bg-color);
                    color: var(--pri-text-color);
                }

                .btn-danger:hover {
                    background-color: var(--ter-button-hover-color);
                }

                .btn-small {
                    padding: 0.25rem 0.5rem;
                    font-size: 0.75rem;
                }

                .error {
                    color: var(--ter-button-bg-color);
                    font-size: 0.75rem;
                    margin-top: 0.25rem;
                }

                .emoji-list {
                    background-color: var(--sec-bg-color);
                    border: 1px solid var(--pri-bd-color);
                    border-radius: 0.25rem;
                    padding: 1.5rem;
                }

                .emoji-list h2 {
                    font-size: 1rem;
                    font-weight: 800;
                    margin-bottom: 1rem;
                }

                .emoji-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 1rem;
                }

                .config-item {
                    display: flex;
                    flex-direction: column;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: default;
                    border-radius: 0.25rem;
                    padding: 1rem;
                    background-color: var(--ter-bg-color);
                    border: 1px solid transparent;
                }

                .config-item:hover {
                    background-color: var(--pri-hover-color);
                    border-color: var(--pri-bd-color);
                }

                .emoji-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 0.75rem;
                }

                .emoji-preview {
                    width: 3rem;
                    height: 3rem;
                    background-color: var(--qua-bg-color);
                    border-radius: 0.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    flex-shrink: 0;
                }

                .emoji-preview img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                }

                .emoji-info {
                    flex: 1;
                    margin-left: 0.75rem;
                    min-width: 0;
                }

                .emoji-name {
                    font-weight: 800;
                    font-size: 1rem;
                    word-break: break-word;
                    margin-bottom: 0.25rem;
                }

                .emoji-keywords {
                    font-size: 0.75rem;
                    color: var(--pri-placeholder-color);
                    min-height: 1rem;
                }

                .emoji-actions {
                    display: flex;
                    gap: 0.5rem;
                    margin-top: 0.75rem;
                }

                .emoji-actions button {
                    flex: 1;
                }

                .modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .modal.active {
                    display: flex;
                }

                .modal-content {
                    background-color: var(--pri-bg-color);
                    border: 1px solid var(--pri-bd-color);
                    border-radius: 0.25rem;
                    padding: 2rem;
                    max-width: 500px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                }

                .modal-header {
                    margin-bottom: 1.5rem;
                }

                .modal-header h3 {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: var(--pri-text-color);
                }

                .modal-footer {
                    display: flex;
                    gap: 0.75rem;
                    justify-content: flex-end;
                    margin-top: 1.5rem;
                }

                .empty-state {
                    text-align: center;
                    padding: 3rem 2rem;
                    color: var(--pri-placeholder-color);
                    grid-column: 1 / -1;
                }

                .empty-state svg {
                    width: 4rem;
                    height: 4rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .empty-state h3 {
                    margin-bottom: 0.5rem;
                    font-size: 1.25rem;
                }

                button svg {
                    width: 1rem;
                    height: 1rem;
                }
                
                .emote-list-button {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    column-gap: 10px;
                }

                /* Hidden slot */
                ::slotted(*) {
                    display: none;
                }
            </style>

            <div class="container">
                <slot name="emojis-data"></slot>

                <div class="add-section">
                    <h2>+ Add an emoji</h2>
                    <form class="add-form" id="addForm">
                        <div class="form-row-with-preview">
                            <div style="flex: 1; display: flex; flex-direction: column; gap: 1rem;">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="emojiFile">Emoji image</label>
                                        <input type="file" id="emojiFile" accept="image/*" required>
                                        <div class="error" id="fileError"></div>
                                    </div>
                                    <div class="form-group">
                                        <label for="emojiName">Name (no spaces)</label>
                                        <input type="text" id="emojiName" placeholder="e.g. super_emoji" required>
                                        <div class="error" id="nameError"></div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="emojiKeywords">Keywords (optional, comma-separated)</label>
                                    <input type="text" id="emojiKeywords" placeholder="e.g. happy, smile, joy">
                                </div>
                            </div>
                            <div class="preview-container" id="addPreview"></div>
                        </div>
                        <button type="submit" class="btn-primary">Add emoji</button>
                    </form>
                </div>

                <div class="emoji-list">
                    <h2>My collection (<span id="emojiCount">0</span>)</h2>
                    <div class="emoji-grid" id="emojiGrid"></div>
                </div>
            </div>

            <div class="modal" id="editModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Edit emoji</h3>
                    </div>
                    <form id="editForm">
                        <div class="form-row-with-preview">
                            <div style="flex: 1; display: flex; flex-direction: column; gap: 1rem;">
                                <div class="form-group">
                                    <label for="editName">Name (no spaces)</label>
                                    <input type="text" id="editName" required>
                                    <div class="error" id="editNameError"></div>
                                </div>
                                <div class="form-group">
                                    <label for="editKeywords">Keywords (comma-separated)</label>
                                    <input type="text" id="editKeywords">
                                </div>
                                <div class="form-group">
                                    <label for="editEmojiFile">Change image</label>
                                    <input type="file" id="editEmojiFile" accept="image/*">
                                </div>
                            </div>
                            <div class="preview-container" id="editPreview"></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn-secondary" id="cancelEdit">Cancel</button>
                            <button type="submit" class="btn-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }
}

customElements.define('revoice-emoji-manager', EmojiManager);
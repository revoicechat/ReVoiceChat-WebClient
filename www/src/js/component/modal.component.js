/** Custom Modal Implementation using native <dialog> */
export default class Modal {
    static #instance = new Modal();

    /**
     * @param {*} options
     * @returns {Promise<unknown>}
     */
    static async toggle(options) {
        await Modal.#instance.#fire(options);
    }

    constructor() {
        const dialogHTML = `
            <dialog id="custom-modal" class="custom-dialog">
                <div class="dialog-content">
                    <div class="dialog-icon"></div>
                    <h2 class="dialog-title"></h2>
                    <p class="dialog-text"></p>
                    <form method="dialog" class="dialog-buttons">
                        <button value="confirm" class="dialog-confirm">OK</button>
                        <button value="cancel" class="dialog-cancel" style="display: none;">Cancel</button>
                    </form>
                </div>
            </dialog>
        `;

        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        this.dialog = document.getElementById('custom-modal');

        // Add styles
        this.#addStyles();
    }

    #addStyles() {
        if (document.getElementById('dialog-styles')) return;
        document.head.insertAdjacentHTML(
            'beforeend',
            `<link id="dialog-styles" href="src/js/component/modal.component.css" rel="stylesheet" />`
        );
    }

    /**
     * @param {*} opt
     * @returns {Promise<unknown>}
     */
    #fire(opt) {
        return new Promise((resolve) => {
            const options = ModalOptions.of(opt);
            // Set icon
            const iconEl = this.dialog.querySelector('.dialog-icon');
            iconEl.className = 'dialog-icon';
            if (options.icon) {
                iconEl.style.display = 'block';
                iconEl.classList.add(options.icon);
            } else {
                iconEl.style.display = 'none';
            }

            // Set title
            this.dialog.querySelector('.dialog-title').textContent = options.title || '';

            // Set text
            const textEl = this.dialog.querySelector('.dialog-text');
            if (options.text) {
                textEl.textContent = options.text;
                textEl.style.display = 'block';
            } else if (options.html) {
                textEl.innerHTML = options.html;
                textEl.style.display = 'block';
            } else {
                textEl.textContent = '';
                textEl.style.display = 'none';
            }

            // Set buttons
            const confirmBtn = this.dialog.querySelector('.dialog-confirm');
            const cancelBtn = this.dialog.querySelector('.dialog-cancel');

            confirmBtn.textContent = options.confirmButtonText || 'OK';
            cancelBtn.style.display = options.showCancelButton ? 'inline-block' : 'none';

            // Handle dialog close
            const handleClose = (e) => {
                const returnValue = this.dialog.returnValue;
                this.dialog.removeEventListener('close', handleClose);

                if (returnValue === 'confirm') {
                    resolve({ isConfirmed: true });
                } else {
                    resolve({ isConfirmed: false, isDismissed: true });
                }
            };

            // Handle click outside
            const handleClick = (e) => {
                if (options.allowOutsideClick && e.target === this.dialog) {
                    const rect = this.dialog.getBoundingClientRect();
                    if (
                        e.clientX < rect.left ||
                        e.clientX > rect.right ||
                        e.clientY < rect.top ||
                        e.clientY > rect.bottom
                    ) {
                        this.dialog.close('cancel');
                    }
                }
            };

            this.dialog.addEventListener('close', handleClose, { once: true });
            this.dialog.addEventListener('click', handleClick);

            // Show modal using native showModal()
            this.dialog.showModal();
        });
    }
}

class ModalOptions {
    /** @type string */
    icon;
    /** @type string */
    title;
    /** @type string */
    text;
    /** @type string */
    html;
    /** @type boolean */
    showCancelButton;
    /** @type string */
    confirmButtonText;
    /** @type boolean */
    allowOutsideClick = true

    /**
     * @param {*} options
     * @returns {ModalOptions}
     */
    static of(options) {
        const modalOptions = new ModalOptions();
        modalOptions.icon              = options.icon
        modalOptions.title             = options.title
        modalOptions.text              = options.text
        modalOptions.html              = options.html
        modalOptions.showCancelButton  = options.showCancelButton
        modalOptions.confirmButtonText = options.confirmButtonText
        modalOptions.allowOutsideClick = options.allowOutsideClick ?? true
        return modalOptions
    }
}
/** Custom Modal Implementation using native <dialog> */
export default class Modal {
    static #instance = new Modal();

    async static toggle(options) {
        await Modal.#instance.#fire(options);
    }

    constructor() {
        this.dialog = null;
        this.#createModalStructure();
    }

    #createModalStructure() {
        // Create native dialog HTML structure
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

        const styles = `
            <style id="dialog-styles">
                .custom-dialog {
                    border: none;
                    border-radius: 8px;
                    padding: 0;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                    background: var(--background-color, #1e1e1e);
                }

                .custom-dialog::backdrop {
                    background: rgba(0, 0, 0, 0.5);
                }

                .dialog-content {
                    padding: 2rem;
                    text-align: center;
                }

                .dialog-icon {
                    width: 60px;
                    height: 60px;
                    margin: 0 auto 1rem;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                }

                .dialog-icon.error {
                    background: #f44336;
                    color: white;
                }

                .dialog-icon.error::before {
                    content: '✕';
                }

                .dialog-icon.success {
                    background: #4caf50;
                    color: white;
                }

                .dialog-icon.success::before {
                    content: '✓';
                }

                .dialog-title {
                    margin: 0 0 1rem;
                    font-size: 1.5rem;
                    color: var(--pri-text-color, #ffffff);
                }

                .dialog-text {
                    margin: 0 0 1.5rem;
                    color: var(--pri-text-color, #cccccc);
                }

                .dialog-buttons {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }

                .dialog-confirm,
                .dialog-cancel {
                    padding: 0.75rem 2rem;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 1rem;
                    transition: background 0.3s;
                }

                .dialog-confirm {
                    background: var(--pri-button-bg-color);
                    color: white;
                }

                .dialog-confirm:hover {
                    background: var(--pri-button-hover-color);
                }

                .dialog-cancel {
                    background: #757575;
                    color: white;
                }

                .dialog-cancel:hover {
                    background: #616161;
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    #fire(options) {
        return new Promise((resolve) => {
            const { icon, title, text, html, showCancelButton, confirmButtonText, allowOutsideClick = true } = options;

            // Set icon
            const iconEl = this.dialog.querySelector('.dialog-icon');
            iconEl.className = 'dialog-icon';
            if (icon) {
                iconEl.style.display = 'block';
                iconEl.classList.add(icon);
            } else {
                iconEl.style.display = 'none';
            }

            // Set title
            this.dialog.querySelector('.dialog-title').textContent = title || '';

            // Set text
            const textEl = this.dialog.querySelector('.dialog-text');
            if (text) {
                textEl.textContent = text;
                textEl.style.display = 'block';
            } else if (html) {
                textEl.innerHTML = html;
                textEl.style.display = 'block';
            } else {
                textEl.textContent = '';
                textEl.style.display = 'none';
            }

            // Set buttons
            const confirmBtn = this.dialog.querySelector('.dialog-confirm');
            const cancelBtn = this.dialog.querySelector('.dialog-cancel');

            confirmBtn.textContent = confirmButtonText || 'OK';
            cancelBtn.style.display = showCancelButton ? 'inline-block' : 'none';

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
                if (allowOutsideClick && e.target === this.dialog) {
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
class NotificationDotComponent extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    /** generate the data in slot */
    connectedCallback() {
        this.#setupDOM()
    }

    #setupDOM() {
        this.shadowRoot.innerHTML = `
        <style>
            .dot {
            width:  0.6rem;
                height: 0.6rem;
                background-color: var(--pri-button-bg-color);
                margin-right: 0.1rem;
                border-radius: 9999px;
                
            }
        </style>
        <div id="dot" class="dot">
        </div>`
    }
}

customElements.define('revoice-notification-dot', NotificationDotComponent);
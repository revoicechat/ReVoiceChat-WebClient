class DotComponent extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['color'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'color' && oldValue !== newValue) {
            this.#setupDOM();
        }
    }

    /** generate the data in slot */
    connectedCallback() {
        this.#setupDOM()
    }

    #setupDOM() {
        this.shadowRoot.innerHTML = `
        <style>
            .background-green {
                background-color: #22c55e;
            }

            .background-orange {
                background-color: #fb883c;
            }

            .background-red {
                background-color: #ff0000;
            }

            .background-gray {
                background-color: #71717a;
            }

            .dot {
                border-style: solid;
                border-width: 2px;
                border-color: rgb(31 41 55);
                border-radius: 9999px;
                
            }
            
            .notification {
                width:  0.6rem;
                height: 0.6rem;
                background-color: var(--pri-button-bg-color);
                margin-right: 0.1rem;
            }

            .status {
                position: absolute;
                right: -0.25rem;
                bottom: -0.25rem;
                width: 0.9rem;
                height: 0.9rem;
            }
        </style>
        <div id="dot" class="dot background-${this.colorAttribute} ${this.typeAttribute}">`
    }

    get colorAttribute() {
        const color = this.getAttribute("color");
        return ["gray", "green", "orange", "red", "white"].includes(color) ? color : "gray";
    }

    get typeAttribute() {
        const type = this.getAttribute("type");
        return ["notification", "status"].includes(type) ? type : "";
    }
}

customElements.define('revoice-dot', DotComponent);
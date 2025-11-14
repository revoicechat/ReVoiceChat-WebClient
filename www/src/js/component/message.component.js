class MessageComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.markdown = '';
    }

    static get observedAttributes() {
        return ['markdown', 'theme', 'data-theme'];
    }

    /** generate the data in slot */
    connectedCallback() {
        this.#setupShadowDOM();
        this.#render();
        this.#updateTheme()
    }

    /** update the data in slot */
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'markdown' && oldValue !== newValue) {
            this.markdown = newValue || '';
            this.#render();
        } else if ((name === 'theme' || name === 'data-theme') && oldValue !== newValue) {
            this.#updateTheme();
        }
    }

    #setupShadowDOM() {
        // Create the shadow DOM structure
        this.shadowRoot.innerHTML = `
                    <style>
                        /*@import url("https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/styles/github-dark-dimmed.min.css");*/

                        :host {
                            display: block;
                            padding: 0 10px;
                            overflow-y: auto;
                            box-sizing: border-box;
                        }
                        /* Markdown content styling */
                        .markdown-content h1,
                        .markdown-content h2,
                        .markdown-content h3,
                        .markdown-content h4,
                        .markdown-content h5,
                        .markdown-content h6 {
                            color: #58a6ff;
                            border-bottom: 1px solid #30363d;
                            padding-bottom: 5px;
                            margin: 10px 0 5px 0;
                        }
                        
                        .markdown-content p {
                            color: var(--pri-text-color);
                            margin: 0;
                        }
                        
                        .markdown-content ul, 
                        .markdown-content ol {
                            padding-left: 20px;
                            color: var(--pri-text-color);
                        }
                        
                        .markdown-content li {
                            margin: 8px 0;
                        }
                        
                        .markdown-content blockquote {
                            border-left: 4px solid #58a6ff;
                            margin: 16px 0;
                            color: #8b949e;
                            background: rgba(88, 166, 255, 0.1);
                            border-radius: 0 6px 6px 0;
                            padding: 16px;
                        }
                        
                        .markdown-content code:not(.hljs) {
                            background: #21262d;
                            color: var(--pri-text-color);
                            padding: 2px 6px;
                            border-radius: 3px;
                            font-family: 'Fira Code', Consolas, monospace;
                            font-size: 0.9em;
                        }
                        
                        .markdown-content pre {
                            background: var(--hljs-background);
                            border-radius: 6px;
                            overflow-x: auto;
                            margin: 8px 0;
                            border: 1px solid #30363d;
                        }
                        
                        .markdown-content a {
                            color: #58a6ff;
                            text-decoration: none;
                        }
                        
                        .markdown-content a:hover {
                            text-decoration: underline;
                        }
                        
                        .markdown-content hr {
                            border: none;
                            border-top: 1px solid #30363d;
                            margin: 24px 0;
                        }
                        
                        .markdown-content table {
                            border-collapse: collapse;
                            width: 100%;
                            margin: 16px 0;
                        }
                        
                        .markdown-content th,
                        .markdown-content td {
                            border: 1px solid #30363d;
                            padding: 8px 12px;
                            text-align: left;
                        }
                        
                        .markdown-content th {
                            background: #21262d;
                            color: #58a6ff;
                            font-weight: bold;
                        }
                        .emoji {
                            width: 1.5rem;
                            height: 1.5rem;
                        }

                        a.media {
                          cursor: pointer;
                          pointer-events: initial;
                        }
                        
                        img.media {
                          max-width: 300px;
                          max-height: 300px;
                          border-radius: 10px;
                        }
                        video.media {
                          max-width: 300px;
                          max-height: 300px;
                        }
                        .file-type-link {
                            max-height: 30px;
                            height: 30px;
                            display: flex;
                            align-items: center;
                            width: 300px;
                            column-gap: 10px;
                            padding: 10px;
                            background-color: var(--ter-bg-color);
                            border-radius: 10px;
                            transition: background 0.2s;
                        }
                        .file-type-link:hover {
                            background-color: var(--pri-active-color);
                        }
                        svg {
                            max-height: 24px;
                            height: 24px;
                        }
                    </style>
                    <div class="container">
                        <div class="markdown-content" id="content"></div>
                        <slot name="medias" style="display: none;"></slot>
                        <slot name="content" style="display: none;"></slot>
                        <slot name="emotes" style="display: none;"></slot>
                    </div>
                `;

        // Listen for slotchange events
        this.shadowRoot.addEventListener('slotchange', (e) => {
            if (e.target.name === 'medias') {
                this.#handleSlottedMedias();
            }
            if (e.target.name === 'content') {
                this.#handleSlottedContent();
            }
            if (e.target.name === 'emotes') {
                this.#handleSlottedEmotes();
            }
        });
    }

    #handleSlottedMedias() {
        const mediasSlot = this.shadowRoot.querySelector('slot[name="medias"]');
        const slottedElements = mediasSlot.assignedElements();
        for (const element of slottedElements) {
            if (element.tagName === 'SCRIPT' && element.type === 'application/json') {
                this.medias = JSON.parse(element.textContent)
                break;
            }
        }
    }

    #handleSlottedContent() {
        const contentSlot = this.shadowRoot.querySelector('slot[name="content"]');
        const slottedElements = contentSlot.assignedElements();

        for (const element of slottedElements) {
            if (element.tagName === 'SCRIPT' && element.type === 'text/markdown') {
                this.markdown = element.textContent.trim();

                if (this.markdown) {
                    this.#render();
                }

                break;
            }
        }
    }

    #handleSlottedEmotes() {
        const emotesSlot = this.shadowRoot.querySelector('slot[name="emotes"]');
        const slottedElements = emotesSlot.assignedElements();
        for (const element of slottedElements) {
            if (element.tagName === 'SCRIPT' && element.type === 'application/json') {
                this.emotes = JSON.parse(element.textContent)
                break;
            }
        }
    }

    #hideSlots() {
        this.shadowRoot.querySelector('.container').className = 'container';
    }

    #updateTheme() {
        let theme = getComputedStyle(this).getPropertyValue("--hljs-theme").trim();
        theme = theme.substring(1, theme.length - 1)
        const link = document.createElement("link");
        link.id = "highlightjs-theme";
        link.rel = "stylesheet";
        link.href = theme;
        this.shadowRoot.appendChild(link);
    }

    #render() {
        const contentDiv = this.shadowRoot.getElementById('content');

        // Check if there's slotted content
        if (!this.markdown) {
            this.#handleSlottedContent();
        }
        this.#handleSlottedMedias();
        this.#handleSlottedEmotes();

        if (typeof marked === 'undefined') {
            contentDiv.innerHTML = '<p style="color: #ff6b6b;">marked.js library not loaded</p>';
            return;
        }
        try {
            this.#setupMarked()
            this.#hideSlots();

            contentDiv.innerHTML = this.#injectMedias();

            if (this.markdown) {
                contentDiv.innerHTML += this.#injectEmojis(marked.parse(this.#removeTags(this.markdown)));
            }

            this.#renderCodeTemplate(contentDiv);
        } catch (error) {
            console.error('Markdown parsing error:', error);
            contentDiv.innerHTML = `<p style="color: #ff6b6b;">Error parsing markdown: ${error.message}</p>`;
        }
    }

    #renderCodeTemplate(contentDiv) {
        for (const block of contentDiv.querySelectorAll('pre code')) {
            hljs.highlightElement(block);
        }
    }

    /** Identify HTML tags in the input string. Replacing the identified HTML tag with a null string.*/
    #removeTags(str) {
        if (!str) return "";
        const div = document.createElement("div");
        div.innerHTML = String(str);
        return div.textContent || "";
    }

    #injectEmojis(inputText) {
        return inputText.replace(/:([A-Za-z0-9\-_]+):/g, (_, emoji) => {
            if (this.emotes) {
                const emote = Array.from(this.emotes).find(item => item.name === emoji);
                if (emote) {
                    return `<img class="emoji" src="${RVC.mediaUrl}/emote/${emote.id}" alt="${emoji}" title=":${emoji}:">`;
                }
            }
            return `:${emoji}:`
        });
    }

    #setupMarked() {
        const renderer = new marked.Renderer();
        renderer.heading = function ({ tokens: e, depth: t }) {
            const text = this.parser.parse(e);
            const DIV = document.createElement('div');
            DIV.innerHTML = text
            const p = DIV.children.item(0)
            p.innerHTML = '#'.repeat(t) + " " + p.innerHTML;
            return p.innerHTML;
        }
        renderer.link = function ({ href: e, title: t, tokens: n }) {
            // Allow only http(s), www, or IP-style links
            if (/^(https?:\/\/|www\.|(\d{1,3}\.){3}\d{1,3})/.test(e)) {
                return `<a href="${e}" target="_blank" rel="noopener noreferrer">${e}</a>`;
            }
            return this.parser.parse(n);
        }

        marked.use({ renderer })
        marked.use({
            breaks: true,
            gfm: true
        });
    }

    #injectMedias() {
        let result = "";
        if (this.medias) {
            for (const media of this.medias) {
                if (media.status === "STORED") {
                    result += `<revoice-attachement-message id="${media.id}" name="${media.name}" type="${media.type}"></revoice-attachement-message>`
                }
            }
        }
        return result;
    }
}

customElements.define('revoice-message', MessageComponent);
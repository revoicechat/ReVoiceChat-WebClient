class MessageComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
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
                    </style>
                    <div class="container">
                        <div class="markdown-content" id="content"></div>
                        <slot name="content" style="display: none;"></slot>
                        <slot name="emotes" style="display: none;"></slot>
                    </div>
                `;

    // Listen for slotchange events
    this.shadowRoot.addEventListener('slotchange', (e) => {
      if (e.target.name === 'content') {
        this.#handleSlottedContent();
      }
      if (e.target.name === 'emotes') {
        this.#handleSlottedEmotes();
      }
    });
  }

  #handleSlottedContent() {
    const contentSlot = this.shadowRoot.querySelector('slot[name="content"]');
    const slottedElements = contentSlot.assignedElements();

    for (const element of slottedElements) {
      if (element.tagName === 'SCRIPT' && element.type === 'text/markdown') {
        this.markdown = element.textContent.trim();
        this.#render();
        break;
      }
    }
  }

  #handleSlottedEmotes() {
    const emotesSlot = this.shadowRoot.querySelector('slot[name="emotes"]');
    console.log(emotesSlot);
    const slottedElements = emotesSlot.assignedElements();
    console.log(slottedElements);
    for (const element of slottedElements) {
      console.log(element);
      console.log(element.tagName);
      console.log(element.type);
      console.log(element.textContent);
      if (element.tagName === 'SCRIPT' && element.type === 'application/json') {
        this.emotes = JSON.parse(element.textContent)
        console.log(this.emotes);
        break;
      }
    }
  }

  #hideSlots() {
    this.shadowRoot.querySelector('.container').className = 'container';
  }

  #updateTheme() {
    let theme = getComputedStyle(this).getPropertyValue("--hljs-theme").trim();
    theme = theme.substring(1, theme.length -1)
    console.log('Theme updated to:', theme);
    const link = document.createElement("link");
    link.id = "highlightjs-theme";
    link.rel = "stylesheet";
    link.href = theme;
    this.shadowRoot.appendChild(link);
  }

  #render() {
    const contentDiv = this.shadowRoot.getElementById('content');

    if (!this.markdown) {
      // Check if there's slotted content
      this.#handleSlottedContent();
      this.#handleSlottedEmotes();
      if (!this.markdown) {
        contentDiv.innerHTML = '<p style="color: #8b949e; font-style: italic;">No markdown content provided</p>';
        return;
      }
    }

    if (typeof marked === 'undefined') {
      contentDiv.innerHTML = '<p style="color: #ff6b6b;">marked.js library not loaded</p>';
      return;
    }
    try {
      this.#setupMarked()
      this.#hideSlots();
      contentDiv.innerHTML = this.#injectEmojis(marked.parse(this.#removeTags(this.markdown)));
      this.#renderCodeTemplate(contentDiv);
    } catch (error) {
      console.error('Markdown parsing error:', error);
      contentDiv.innerHTML = `<p style="color: #ff6b6b;">Error parsing markdown: ${error.message}</p>`;
    }
  }

  #renderCodeTemplate(contentDiv) {
    contentDiv.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block);
    });
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
      if (global.chat.emojisGlobal.includes(emoji)) {
        return `<img class="emoji" src="${global.url.media}/emojis/${emoji}" alt="${emoji}" title=":${emoji}:">`;
      }
      console.log(this.emotes);
      const emote = Array.from(this.emotes).find(item => item.name === emoji);
      if (emote) {
        return `<img class="emoji" src="${global.url.media}/emojis/${emote.id}" alt="${emoji}" title=":${emoji}:">`;
      }
      return `:${emoji}:`
    });
  }

  #setupMarked() {
    var renderer = new marked.Renderer();
    renderer.heading = function ({tokens: e, depth: t}) {
      const text = this.parser.parse(e);
      const DIV = document.createElement('div');
      DIV.innerHTML = text
      const p = DIV.children.item(0)
      p.innerHTML = '#'.repeat(t) + " " + p.innerHTML;
      return p.innerHTML;
    }
    renderer.link = function ({href:e, title:t, tokens:n}) {
      // Allow only http(s), www, or IP-style links
      if (/^(https?:\/\/|www\.|(\d{1,3}\.){3}\d{1,3})/.test(e)) {
        return `<a href="${e}" target="_blank" rel="noopener noreferrer">${e}</a>`;
      }
      return this.parser.parse(n);
    }

    marked.use({renderer})
    marked.use({
      breaks: true,
      gfm: true
    });
  }
}

customElements.define('revoice-message', MessageComponent);
class MessageComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.markdown = '';
  }

  static get observedAttributes() {
    return ['markdown', 'theme'];
  }

  /** generate the data in slot */
  connectedCallback() {
    this.#setupShadowDOM();
    this.#setupMarked();
    this.#render();
  }

  /** update the data in slot */
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'markdown' && oldValue !== newValue) {
      this.markdown = newValue || '';
      this.#render();
    } else if (name === 'theme' && oldValue !== newValue) {
      this.#updateTheme(newValue);
    }
  }

  #setupShadowDOM() {
    // Create the shadow DOM structure
    this.shadowRoot.innerHTML = `
                    <style>
                        @import url("https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/styles/github-dark-dimmed.min.css");

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
                            color: #e6edf3;
                            margin: 0;
                        }
                        
                        .markdown-content ul, 
                        .markdown-content ol {
                            padding-left: 20px;
                            color: #e6edf3;
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
                            color: #e6edf3;
                            padding: 2px 6px;
                            border-radius: 3px;
                            font-family: 'Fira Code', Consolas, monospace;
                            font-size: 0.9em;
                        }
                        
                        .markdown-content pre {
                            background: #21262d;
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
                    </div>
                `;

    // Listen for slotchange events
    this.shadowRoot.addEventListener('slotchange', (e) => {
      if (e.target.name === 'content') {
        this.#handleSlottedContent();
      }
    });
  }

  #setupMarked() {
    // Configure marked with highlight.js integration
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        highlight(code, lang, info) {
          if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
          }
          return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
      });
    }
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

  #hideSlots() {
    this.shadowRoot.querySelector('.container').className = 'container';
  }

  #updateTheme(theme) {
    // Could be extended to support different themes
    console.log('Theme updated to:', theme);
  }

  #render() {
    const contentDiv = this.shadowRoot.getElementById('content');

    if (!this.markdown) {
      // Check if there's slotted content
      this.#handleSlottedContent();
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
      this.#hideSlots();
      console.log(this.#injectEmojis(marked.parse(this.#removeTags(this.markdown))))
      contentDiv.innerHTML = this.#injectEmojis(marked.parse(this.#removeTags(this.markdown)));
      contentDiv.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
      });
    } catch (error) {
      console.error('Markdown parsing error:', error);
      contentDiv.innerHTML = `<p style="color: #ff6b6b;">Error parsing markdown: ${error.message}</p>`;
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
      // Call your custom function with the extracted content
      if (global.chat.emojisGlobal.includes(emoji)) {
        return `<img class="emoji" src="${global.url.media}/emojis/global/${emoji}" alt="${emoji}" title=":${emoji}:">`;
      } else {
        return `:${emoji}:`
      }
    });
  }
}

customElements.define('revoice-message', MessageComponent);
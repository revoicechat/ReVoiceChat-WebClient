class MessageComponent extends HTMLElement {

  constructor() {
    super()
    this.shadow = this.attachShadow({mode: 'open'})
    this.shadow.innerHTML = `
                <script type="javascript" src="/src/js/lib/marked.min.js"></script>
                <style>
                  #content {
                   padding-left: 10px;
                  }
                  * {
                    margin: 0;
                  }
                  a {
                    color: darkturquoise;
                  }
                  blockquote {
                      border-left: #C0C0C0 3px solid;
                      padding-left: 5px;
                      color: #C0C0C0;
                  }
                  
                  code {
                      border: #F0F0F0 1px solid;
                      border-radius: 3px;
                      padding-left: 5px;
                      padding-right: 5px;
                      background-color: #353e4b;
                  }
                </style>
                <slot hidden></slot>
                <div id="content"></div>`
    this._contentEl = this.shadowRoot.querySelector("#content");
    this._slot = this.shadowRoot.querySelector("slot");
  }


  connectedCallback() {
    this.renderMarkdown();
    this._slot.addEventListener("slotchange", () => this.renderMarkdown());
  }

  renderMarkdown() {
    const assignedNodes = this._slot.assignedNodes({ flatten: true });
    const text = assignedNodes.map(n => n.textContent).join("");
    this._contentEl.innerHTML = marked.parse(this.injectEmojis(this.removeTags(text)));
  }

  /** Identify HTML tags in the input string. Replacing the identified HTML tag with a null string.*/
  removeTags(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.innerHTML = String(str);
    return div.textContent || "";
  }

  injectEmojis(inputText) {
    let result = [];
    let inputArray = inputText.split(" ");

    inputArray.forEach(element => {
      // Not emoji
      if (element.charAt(0) !== ':' && element.charAt(element.length - 1) !== ':') {
        result.push(element);
        return;
      }

      // Emoji
      const emoji = element.substring(1, element.length - 1);
      if (global.chat.emojisGlobal.includes(emoji)) {
        result.push(`<img src="${global.url.media}/emojis/global/${emoji}" alt="${emoji}" title=":${emoji}:">`);
        return;
      }

      // Don't exist
      return result.push(element);
    });

    return result.join(" ");
  }
}

customElements.define('revoice-message', MessageComponent);
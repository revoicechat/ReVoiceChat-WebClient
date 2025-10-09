class ThemePreviewComponent extends HTMLElement {

  connectedCallback() {
    const dataTheme = this.getAttribute("theme")
    this.innerHTML = `
      <style>
        .data-theme-holder {
            width: 220px;
            height: 160px;
            min-width: 220px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-evenly;
        }

        .data-theme-container {
            width: 200px;
            height: 120px;
            background-color: var(--pri-bg-color);
            display: flex;
        }

        .data-theme-left {
            width: 30%;
            display: flex;
            flex-direction: column;
        }

        .data-theme-center {
            background-color: var(--sec-bg-color);;
            width: 50%;
            display: flex;
            flex-direction: column;
            text-align: justify;
        }

        .data-theme-right {
            background-color: var(--sec-bg-color);
            width: 20%;
            display: flex;
            flex-direction: column;
        }

        .data-theme-left-name, .data-theme-left-list {
            background-color: var(--pri-bg-color);
        }

        .data-theme-left-user {
            background-color: var(--ter-bg-color);
        }

        .data-theme-left-name,
        .data-theme-left-user,
        .data-theme-center-name,
        .data-theme-center-input,
        .data-theme-right-name,
        .data-theme-right-last {
            height: 10%;
        }

        .data-theme-left-list, .data-theme-center-messages, .data-theme-right-list {
            height: -webkit-fill-available;
        }

        .data-theme-left-name,
        .data-theme-center-name,
        .data-theme-right-name {
            border-bottom: 1px solid;
            border-color: var(--pri-bd-color);
        }

        .data-theme-left-user,
        .data-theme-center-input {
            border-top: 1px solid;
            border-color: var(--pri-bd-color);
        }

        .data-theme-center {
            border-left: 1px solid;
            border-right: 1px solid;
            border-color: var(--pri-bd-color);
        }

        .data-theme-right-name {
            border-bottom: 1px solid;
            border-color: var(--pri-bd-color);
        }

        .data-theme-right-list {
            border-color: var(--pri-bd-color);
        }

        .data-theme-message-input {
            background-color: var(--ter-bg-color);
            height: 5px;
            width: 95%;
            margin: 2px;
            font-size: 4px;
            color: var(--pri-placeholder-color);
        }

        .data-theme-center-messages, .data-theme-right-list {
            display: flex;
            flex-direction: column;
        }

        .data-theme-button {
            font-size: 4px;
            margin: 2px;
            padding: 2px;
            border-radius: 2px;
        }

        .data-theme-message {
            color: var(--pri-text-color);
            font-size: 4px;
            margin: 2px;
        }
    </style>
      <div class="data-theme-holder">
          <div data-theme="${dataTheme}">
              <div class="data-theme-container">
                  <div class="data-theme-left">
                      <div class="data-theme-left-name"></div>
                      <div class="data-theme-left-list"></div>
                      <div class="data-theme-left-user"></div>
                  </div>
                  <div class="data-theme-center">
                      <div class="data-theme-center-name"></div>
                      <div class="data-theme-center-messages">
                          <div class="data-theme-message">message 1</div>
                          <div class="data-theme-message">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</div>
                          <div class="data-theme-message">message 2</div>
                          <div class="data-theme-message">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</div>
                      </div>
                      <div class="data-theme-center-input">
                          <div class="data-theme-message-input">insert message</div>
                      </div>
                  </div>
                  <div class="data-theme-right">
                      <div class="data-theme-right-name"></div>
                      <div class="data-theme-right-list">
                          <div class="data-theme-button" style="background-color: var(--pri-button-bg-color)">button 1</div>
                          <div class="data-theme-button" style="background-color: var(--pri-button-hover-color)">button 1 hover</div>
                          <div class="data-theme-button" style="background-color: var(--sec-button-bg-color)">button 2</div>
                          <div class="data-theme-button" style="background-color: var(--sec-button-hover-color)">button 2 hover</div>
                          <div class="data-theme-button" style="background-color: var(--ter-button-hover-color)">button 3</div>
                          <div class="data-theme-button" style="background-color: var(--ter-button-hover-color)">button 3 hover</div>
                      </div>
                      <div class="data-theme-right-last"></div>
                  </div>
              </div>
          </div>
          <div style="text-align: center">${dataTheme}</div>
      </div>
                `;
  }
}

customElements.define('revoice-theme-preview', ThemePreviewComponent);

function getDataThemesFromDOM() {
  return Array.from(new Set(
      Array.from(document.querySelectorAll('[data-theme]'))
          .map(el => el.getAttribute('data-theme') || "")
          .flatMap(v => v.split(/\s+/))
          .filter(Boolean)
  ));
}

function getDataThemesFromStylesheets() {
  const themes = new Set();
  const regex = /\[data-theme\s*=\s*["']?([^"'\]]+)["']?]/g;

  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // skip cross-origin
    }
    if (!rules) continue;

    const checkRules = (ruleList) => {
      for (const rule of ruleList) {
        if (rule.selectorText) {
          let match;
          while ((match = regex.exec(rule.selectorText)) !== null) {
            themes.add(match[1]);
          }
        }
        if (rule.cssRules) checkRules(rule.cssRules); // handle nested @media
      }
    };
    checkRules(rules);
  }
  return Array.from(themes);
}

function getAllDeclaredDataThemes() {
  return Array.from(new Set([
    ...getDataThemesFromDOM(),
    ...getDataThemesFromStylesheets()
  ])).sort();
}
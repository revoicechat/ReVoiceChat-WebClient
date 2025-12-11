import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {getAllDeclaredDataThemes} from "./theme.component.js";
import './theme.component.js';

describe('theme.component', () => {
  describe('getAllDeclaredDataThemes', () => {
    let styleElement;

    beforeEach(() => {
      document.head.querySelectorAll('style').forEach(el => el.remove());
      document.body.innerHTML = "";
    });

    afterEach(() => {
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    });

    const addStyleSheet = (css) => {
      styleElement = document.createElement('style');
      styleElement.textContent = css;
      document.head.appendChild(styleElement);
    };

    test('should return an empty array when no stylesheets exist', () => {
      const themes = getAllDeclaredDataThemes();
      expect(themes).toEqual([]);
    });

    test("getDataThemesFromDOM", () => {
      document.body.innerHTML = `<div data-theme="green">test 1</div><div data-theme="red">test 2</div>`;
      const values = getAllDeclaredDataThemes();
      expect(values).toEqual(["green", "red"]);
    })

    test("getDataThemesFromStylesheets", () => {
      addStyleSheet(`
      [data-theme="darker"] { color: black; }
      [data-theme="lighter"] { color: white; }
    `);
      const values = getAllDeclaredDataThemes();
      expect(values).toEqual(["darker", "lighter"]);
    })

    test("getDataThemesFromStylesheets with error", () => {
      const mockSheet = {
        get cssRules() {
          throw new Error('Cross-origin');
        }
      };
      const originalStyleSheets = document.styleSheets;
      Object.defineProperty(document, 'styleSheets', {
        value: [mockSheet],
        configurable: true
      });
      const values = getAllDeclaredDataThemes();
      expect(values).toEqual([]);

      Object.defineProperty(document, 'styleSheets', {
        value: originalStyleSheets,
        configurable: true
      });
    });

    test("getDataThemesFromStylesheets", () => {
      document.body.innerHTML = `<div data-theme="purple">test 1</div>`;
      addStyleSheet(`
          [data-theme="orange"] { color: black; }
          [data-theme="white"] { color: white; }
      `);
      const values = getAllDeclaredDataThemes();
      expect(values).toEqual(["orange", "purple", "white"]);
    })
  });

  describe('ThemePreviewComponent', () => {
    beforeEach(async () => {
      document.body.innerHTML = '';
      const icon = document.createElement("revoice-theme-preview");
      icon.setAttribute("theme", "test");
      document.body.appendChild(icon);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    afterEach(()  => document.body.innerHTML = '');

    test("test", () => {
      const divs = document.querySelectorAll('revoice-theme-preview');
      expect(divs).not.toBeNull();
      expect(divs.length).toBe(1);
      const div = divs.item(0);
      const theme = div.querySelector("div[data-theme]")
      expect(theme.getAttribute("data-theme")).toBe("test");
    });
  });
});
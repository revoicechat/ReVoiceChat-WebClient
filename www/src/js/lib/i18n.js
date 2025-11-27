/**
 * Simple internationalization system for vanilla JS
 * Uses .properties files for translations
 */

class I18n {
    /** @param {string} translationDir */
    constructor(translationDir) {
        this.translations = {};
        this.currentLang = 'en';
        this.translationDir = translationDir;
    }

    /**
     * Parse a .properties file into a JavaScript object
     * @param {string} content - Content of the .properties file
     * @returns {Object} Object with key/value pairs
     */
    parseProperties(content) {
        const lines = content.split('\n');
        const result = {};

        for (const line of lines) {
            const trimmed = line.trim();
            // Ignore empty lines and comments
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) {
                continue;
            }
            // Find first = or :
            const separatorIndex = trimmed.search(/[=:]/);
            if (separatorIndex === -1) continue;
            const key = trimmed.substring(0, separatorIndex).trim();
            result[key] = trimmed.substring(separatorIndex + 1).trim();
        }

        return result;
    }

    /**
     * Load a .properties file
     * @param {string} lang - Language code (e.g. 'fr', 'en')
     * @returns {Promise<Object>} Loaded translations
     */
    async loadTranslations(lang) {
        try {
            const response = await fetch(`${this.translationDir}/i18n_${lang}.properties`);

            if (!response.ok) {
                throw new Error(`File i18n_${lang}.properties not found`);
            }

            const content = await response.text();
            return this.parseProperties(content);
        } catch (error) {
            // If file doesn't exist and it's not English, fallback to English
            if (lang !== 'en') {
                console.warn(`Language ${lang} not found, falling back to English`);
                const response = await fetch('i18n_en.properties');
                const content = await response.text();
                return this.parseProperties(content);
            }
            throw error;
        }
    }

    /**
     * Translate all elements with the data-i18n attribute
     * @param {Document|HTMLElement} doc
     */
    translatePage(doc = document) {
        // Translate text content
        const elements = doc.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.translations[key];

            if (translation) {
                element.textContent = translation;
            } else {
                console.warn(`Missing translation for key: ${key}`);
            }
        });

        // Translate title attributes (tooltips)
        const titledElements = doc.querySelectorAll('[data-i18n-title]');
        titledElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const translation = this.translations[key];

            if (translation) {
                element.setAttribute('title', translation);
            } else {
                console.warn(`Missing translation for title key: ${key}`);
            }
        });

        // Translate placeholder attributes
        const placeholderElements = doc.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.translations[key];

            if (translation) {
                element.setAttribute('placeholder', translation);
            } else {
                console.warn(`Missing translation for placeholder key: ${key}`);
            }
        });
    }

    /**
     * Main method to change language
     * @param {string} lang - Language code (e.g. 'fr', 'en')
     */
    async translate(lang) {
        try {
            this.translations = await this.loadTranslations(lang);
            this.currentLang = lang;
            this.translatePage();
            console.log(`Language changed to: ${lang}`);
        } catch (error) {
            console.error('Error loading translations:', error);
        }
    }

    /**
     * Get a translation by key (useful for dynamic JS)
     * @param {string} key - Translation key
     * @returns {string} Translation or the key if not found
     */
    t(key) {
        return this.translations[key] || key;
    }
}

// Export for usage
const i18n = new I18n("src/i18n");

// Usage example:
// i18n.translate('fr');
// i18n.translate('en');
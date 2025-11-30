export class LanguageController {

    static async loadAvailableLanguage() {
        const res = await fetch("src/i18n/lang.json");
        /** @type {Object} */
        const languages = await res.json();
        const select = document.getElementById("setting-language-selection")
        for (const key in languages) {
            const option = document.createElement('option');
            option.value     = key
            option.innerText = languages[key]
            select.appendChild(option);
        }
        select.addEventListener("change", (event) => {
            const value = event.target.value;
            RVC.user.settings.setLangage(value)
            RVC.user.settings.save()
            i18n.translate(value);
        });
    }
}
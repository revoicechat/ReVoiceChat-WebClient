/**
 * This component represent an attachement on a message
 *
 * <revoice-attachement-message id="UUID"
 *                              name="file-name.extension"
 *                              type="TYPE">
 * </revoice-attachement-message>
 */
class AttachementMessageComponent extends HTMLElement {

    connectedCallback() {
        const id = this.getAttribute("id")
        const name = this.getAttribute("name")
        const type = this.getAttribute("type")
        let typeComponentRetriever = this.#TYPES[type]
        if (!typeComponentRetriever) {
          typeComponentRetriever = this.#TYPES["OTHER"]
        }
        const src = `${RVC.mediaUrl}/attachments/${id}`;
        this.innerHTML = `${typeComponentRetriever(src, name)}`
    }


    #TYPES = {
        "PICTURE"    : (src, name) => this.#piture(src, name),
        "VIDEO"      : (src, name) => this.#video(src, name),
        "AUDIO"      : (src, name) => this.#audio(src, name),
        "SVG"        : (src, name) => this.#link(src, name, this.#CODE),
        "PDF"        : (src, name) => this.#link(src, name),
        "TEXT"       : (src, name) => this.#link(src, name, this.#TEXT),
        "OFFICE"     : (src, name) => this.#link(src, name, this.#TEXT),
        "ARCHIVE"    : (src, name) => this.#link(src, name, this.#ARCHIVE),
        "CODE"       : (src, name) => this.#link(src, name, this.#CODE),
        "FONT"       : (src, name) => this.#link(src, name, this.#CODE),
        "MODEL"      : (src, name) => this.#link(src, name),
        "EXECUTABLE" : (src, name) => this.#link(src, name),
        "DATA"       : (src, name) => this.#link(src, name, this.#DATA),
        "OTHER"      : (src, name) => this.#link(src, name),
    }

    #piture(src, name) {
      return `<a class='media' href="${src}" target="_blank">
                  <img class='media' src="${src}" loading="lazy" alt="${name}"/>
              </a>`
    }

    #video(src, name) {
      return `<video class='media' controls><source src="${src}"></video>`
    }

    #audio(src, name) {
      return `<audio class='media' controls><source src="${src}"></audio>`
    }

    #link(src, name, svgType = this.#OTHER) {
      return `<a class='media file-type-link' href="${src}" target="_blank">
                  ${svgType}
                  <div>${name}</div>
              </a>`
    }

    #CODE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                       <path fill-rule="evenodd"
                             d="M14.447 3.026a.75.75 0 0 1 .527.921l-4.5 16.5a.75.75 0 0 1-1.448-.394l4.5-16.5a.75.75 0 0 1 .921-.527ZM16.72 6.22a.75.75 0 0 1 1.06 0l5.25 5.25a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 1 1-1.06-1.06L21.44 12l-4.72-4.72a.75.75 0 0 1 0-1.06Zm-9.44 0a.75.75 0 0 1 0 1.06L2.56 12l4.72 4.72a.75.75 0 0 1-1.06 1.06L.97 12.53a.75.75 0 0 1 0-1.06l5.25-5.25a.75.75 0 0 1 1.06 0Z"
                             clip-rule="evenodd" />
                   </svg>`

    #TEXT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                           <path fill-rule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clip-rule="evenodd" />
                           <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
                       </svg>`

    #ARCHIVE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                           <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375Z" />
                           <path fill-rule="evenodd" d="m3.087 9 .54 9.176A3 3 0 0 0 6.62 21h10.757a3 3 0 0 0 2.995-2.824L20.913 9H3.087Zm6.163 3.75A.75.75 0 0 1 10 12h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd" />
                       </svg>`

    #DATA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                        <path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875Z" />
                        <path d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 0 0 1.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 0 0 1.897 1.384C6.809 12.164 9.315 12.75 12 12.75Z" />
                        <path d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 15.914 9.315 16.5 12 16.5Z" />
                        <path d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 19.664 9.315 20.25 12 20.25Z" />
                    </svg>`

    #OTHER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                         <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
                         <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
                     </svg>`
}

customElements.define('revoice-attachement-message', AttachementMessageComponent);

if (typeof module !== 'undefined') {
    module.exports = [AttachementMessageComponent];
}
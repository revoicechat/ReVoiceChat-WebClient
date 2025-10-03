class TrashIconComponent extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 16 16">
                    <path clip-rule="evenodd"
                        d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z"
                        fill-rule="evenodd"></path>
            </svg>`
    }
}

class PencilIconComponent extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 16 16">
                <path clip-rule="evenodd"
                    d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.596l-2.047.848a.75.75 0 0 1-.98-.98l.848-2.047a2.75 2.75 0 0 1 .596-.892l7.262-7.261Z"
                    fill-rule="evenodd"></path>
            </svg>`
    }
}

class ChatBubbleIconComponent extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                <path clip-rule="evenodd"
                    d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .44 1.223ZM8.25 10.875a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25ZM10.875 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875-1.125a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z"
                    fill-rule="evenodd"></path>
            </svg>`
    }
}

class PhoneIconComponent extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                <path clip-rule="evenodd"
                    d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z"
                    fill-rule="evenodd"></path>
            </svg>`
    }
}

class PhoneXIconComponent extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                <path clip-rule="evenodd"
                    d="M15.22 3.22a.75.75 0 0 1 1.06 0L18 4.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L19.06 6l1.72 1.72a.75.75 0 0 1-1.06 1.06L18 7.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L16.94 6l-1.72-1.72a.75.75 0 0 1 0-1.06ZM1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z"
                    fill-rule="evenodd"></path>
            </svg>`
    }
}

class MicrophoneIconComponent extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z"></path>
                <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z"></path>
            </svg>`
    }
}

class ClipboardIconComponent extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
            </svg>`
    }
}

class CirclePlusIconComponent extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path clip-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z" fill-rule="evenodd"></path>
            </svg>`
    }
}

class FolderPlusIconComponent extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path clip-rule="evenodd" d="M19.5 21a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-5.379a.75.75 0 0 1-.53-.22L11.47 3.66A2.25 2.25 0 0 0 9.879 3H4.5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h15Zm-6.75-10.5a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25v2.25a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V10.5Z" fill-rule="evenodd"></path>
            </svg>`
    }
}

class EyeOpenIconComponent extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path>
                <path clip-rule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" fill-rule="evenodd"></path>
            </svg>`
    }
}

class FolderIconComponent extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z"></path>
            </svg>`
    }
}

class Cog6ToothIconComponent extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path clip-rule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" fill-rule="evenodd"></path>
            </svg>`
    }
}

class UsersIconComponent extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM17.25 19.128l-.001.144a2.25 2.25 0 0 1-.233.96 10.088 10.088 0 0 0 5.06-1.01.75.75 0 0 0 .42-.643 4.875 4.875 0 0 0-6.957-4.611 8.586 8.586 0 0 1 1.71 5.157v.003Z"></path>
            </svg>`
    }
}

class InformationIconComponent extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path clip-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" fill-rule="evenodd"></path>
            </svg>`
    }
}

class SwatchIconComponent extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path clip-rule="evenodd" d="M2.25 4.125c0-1.036.84-1.875 1.875-1.875h5.25c1.036 0 1.875.84 1.875 1.875V17.25a4.5 4.5 0 1 1-9 0V4.125Zm4.5 14.25a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25Z" fill-rule="evenodd"></path>
                <path d="M10.719 21.75h9.156c1.036 0 1.875-.84 1.875-1.875v-5.25c0-1.036-.84-1.875-1.875-1.875h-.14l-8.742 8.743c-.09.089-.18.175-.274.257ZM12.738 17.625l6.474-6.474a1.875 1.875 0 0 0 0-2.651L15.5 4.787a1.875 1.875 0 0 0-2.651 0l-.1.099V17.25c0 .126-.003.251-.01.375Z"></path>
            </svg>`
    }
}

class CircleXIconComponent extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path clip-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" fill-rule="evenodd"></path>
            </svg>`
    }
}

class EnvelopeIconComponent extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z"></path>
                <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z"></path>
            </svg>`
    }
}

class ArrowPointingIn extends HTMLElement {
    constructor() {
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path clip-rule="evenodd" d="M3.22 3.22a.75.75 0 0 1 1.06 0l3.97 3.97V4.5a.75.75 0 0 1 1.5 0V9a.75.75 0 0 1-.75.75H4.5a.75.75 0 0 1 0-1.5h2.69L3.22 4.28a.75.75 0 0 1 0-1.06Zm17.56 0a.75.75 0 0 1 0 1.06l-3.97 3.97h2.69a.75.75 0 0 1 0 1.5H15a.75.75 0 0 1-.75-.75V4.5a.75.75 0 0 1 1.5 0v2.69l3.97-3.97a.75.75 0 0 1 1.06 0ZM3.75 15a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-2.69l-3.97 3.97a.75.75 0 0 1-1.06-1.06l3.97-3.97H4.5a.75.75 0 0 1-.75-.75Zm10.5 0a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-2.69l3.97 3.97a.75.75 0 1 1-1.06 1.06l-3.97-3.97v2.69a.75.75 0 0 1-1.5 0V15Z" fill-rule="evenodd"></path>
            </svg>`
    }
}

class Speaker extends HTMLElement {
    constructor(){
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z"></path>
                <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z"></path>
            </svg>`
    }
}

class SpeakerX extends HTMLElement {
    constructor(){
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 1 0-1.06-1.06l-1.72 1.72-1.72-1.72Z"></path>
            </svg>`
    }
}

class Compressor extends HTMLElement {
        constructor(){
        super()
        this.innerHTML = `
            <svg data-slot="icon" aria-hidden="true" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 913.443 913.443">
                <g>
                    <g>
                        <path d="M160.172,752.869l-35.715,85.408c-2.255,5.395,1.707,11.346,7.553,11.346h101.786c8.608,0,16.375-5.17,19.695-13.113
                            l34.305-82.037H186.389C177.561,754.473,168.815,753.934,160.172,752.869z"/>
                        <path d="M484.246,201.833v105.811h242.809c28.527,0,56.213,5.593,82.291,16.622c21.188,8.962,40.545,21.188,57.717,36.4V201.833
                            c0-14.329-11.615-25.945-25.945-25.945H510.191C495.861,175.888,484.246,187.504,484.246,201.833z"/>
                        <path d="M863.732,669.795c30.844-33.254,49.711-77.775,49.711-126.711v-24.051c0-47.148-17.514-90.2-46.381-123.025
                            c-34.158-38.843-84.217-63.364-140.008-63.364H484.246h-51.687v-12.5v-12.5V115.131l110.21-0.232
                            c5.643,12.801,18.436,21.741,33.324,21.741h91.76c20.109,0,36.41-16.301,36.41-36.41s-16.301-36.41-36.41-36.41l-260.699,0.167
                            c-13.61,0-25.004,11.143-25.435,24.664c-0.043,0.594-0.073,1.192-0.073,1.795v217.197v12.5v12.5H186.389
                            C83.45,332.644,0,416.092,0,519.033v24.051c0,97.5,74.868,177.502,170.249,185.686c5.32,0.455,10.701,0.703,16.14,0.703H298.25
                            h265.603c-0.178-3.041-0.277-6.096-0.277-9.166c0-20.82,4.082-41.033,12.137-60.072c7.773-18.381,18.896-34.881,33.061-49.045
                            c14.164-14.162,30.664-25.285,49.043-33.061c19.041-8.053,39.252-12.137,60.074-12.137s41.033,4.084,60.074,12.137
                            c18.379,7.775,34.879,18.898,49.043,33.061c14.164,14.164,25.287,30.664,33.061,49.043
                            C861.402,663.389,862.617,666.578,863.732,669.795z"/>
                        <path d="M843.32,688.76c-14.082-56.168-64.895-97.766-125.43-97.766c-71.418,0-129.314,57.896-129.314,129.314
                            c0,3.082,0.115,6.137,0.328,9.164c0.295,4.227,0.795,8.396,1.488,12.5c0.715,4.24,1.637,8.41,2.754,12.5
                            c14.986,54.838,65.154,95.15,124.744,95.15c71.418,0,129.314-57.896,129.314-129.314c0-1.086-0.016-2.168-0.041-3.248
                            c-0.121-4.957-0.531-9.84-1.197-14.643C845.326,697.781,844.441,693.225,843.32,688.76z M717.891,762.959
                            c-9.576,0-18.416-3.156-25.535-8.486c-4.51-3.375-8.322-7.629-11.201-12.5c-2.26-3.824-3.938-8.029-4.916-12.5
                            c-0.646-2.953-0.998-6.018-0.998-9.164c0-23.555,19.096-42.65,42.65-42.65s42.652,19.096,42.652,42.65
                            c0,2.123-0.16,4.207-0.461,6.248c-0.697,4.746-2.18,9.232-4.305,13.336c-2.801,5.406-6.721,10.133-11.457,13.879
                            C737.053,759.518,727.877,762.959,717.891,762.959z"/>
                    </g>
                </g>
            </svg>`
    }
}

class EmojiIconComponent extends HTMLElement {
        constructor(){
        super()
        this.innerHTML = `
            <svg data-slot="icon" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path clip-rule="evenodd" fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 0 1-.189-.866c0-.298.059-.605.189-.866Zm2.023 6.828a.75.75 0 1 0-1.06-1.06 3.75 3.75 0 0 1-5.304 0 .75.75 0 0 0-1.06 1.06 5.25 5.25 0 0 0 7.424 0Z"></path>
            </svg>`
        }
}

customElements.define('revoice-icon-pencil', PencilIconComponent);
customElements.define('revoice-icon-trash', TrashIconComponent);
customElements.define('revoice-icon-chat-bubble', ChatBubbleIconComponent);
customElements.define('revoice-icon-phone', PhoneIconComponent);
customElements.define('revoice-icon-phone-x', PhoneXIconComponent);
customElements.define('revoice-icon-microphone', MicrophoneIconComponent);
customElements.define('revoice-icon-clipboard', ClipboardIconComponent);
customElements.define('revoice-icon-circle-plus', CirclePlusIconComponent);
customElements.define('revoice-icon-folder-plus', FolderPlusIconComponent);
customElements.define('revoice-icon-eye-open', EyeOpenIconComponent);
customElements.define('revoice-icon-folder', FolderIconComponent);
customElements.define('revoice-icon-cog-6', Cog6ToothIconComponent);
customElements.define('revoice-icon-users', UsersIconComponent);
customElements.define('revoice-icon-information', InformationIconComponent);
customElements.define('revoice-icon-swatch', SwatchIconComponent);
customElements.define('revoice-icon-circle-x', CircleXIconComponent);
customElements.define('revoice-icon-envelope', EnvelopeIconComponent);
customElements.define('revoice-icon-arrow-in', ArrowPointingIn);
customElements.define('revoice-icon-speaker', Speaker);
customElements.define('revoice-icon-speaker-x', SpeakerX);
customElements.define('revoice-icon-compressor', Compressor);
customElements.define('revoice-icon-emoji', EmojiIconComponent);

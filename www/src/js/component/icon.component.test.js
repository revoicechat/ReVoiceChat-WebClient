import { beforeEach, afterEach, describe, expect, test } from 'vitest';

// Import du fichier qui enregistre les custom elements
import './icon.component.js';


function setup(tagName) {
    beforeEach(async () => {
        const icon = document.createElement(tagName);
        document.body.appendChild(icon);
        // Attendre que le custom element soit complètement initialisé
        await new Promise(resolve => setTimeout(resolve, 0));
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });
}

function shouldRenderAnSVGElement() {
    test('should render an SVG element', () => {
        const svg = document.querySelectorAll('svg');
        expect(svg).not.toBeNull();
        expect(svg.length).toBe(1);
    });
}

describe('IconComponent', () => {
    describe('TrashIconComponent', () => {
        setup('revoice-icon-trash');
        shouldRenderAnSVGElement()
    });

    describe('PencilIconComponent', () => {
        setup('revoice-icon-pencil');
        shouldRenderAnSVGElement();
    });

    describe('ChatBubbleIconComponent', () => {
        setup('revoice-icon-chat-bubble');
        shouldRenderAnSVGElement();
    });

    describe('PhoneIconComponent', () => {
        setup('revoice-icon-phone');
        shouldRenderAnSVGElement();
    });

    describe('PhoneXIconComponent', () => {
        setup('revoice-icon-phone-x');
        shouldRenderAnSVGElement();
    });

    describe('MicrophoneIconComponent', () => {
        setup('revoice-icon-microphone');
        shouldRenderAnSVGElement();
    });

    describe('ClipboardIconComponent', () => {
        setup('revoice-icon-clipboard');
        shouldRenderAnSVGElement();
    });

    describe('CirclePlusIconComponent', () => {
        setup('revoice-icon-circle-plus');
        shouldRenderAnSVGElement();
    });

    describe('FolderPlusIconComponent', () => {
        setup('revoice-icon-folder-plus');
        shouldRenderAnSVGElement();
    });

    describe('EyeOpenIconComponent', () => {
        setup('revoice-icon-eye-open');
        shouldRenderAnSVGElement();
    });

    describe('FolderIconComponent', () => {
        setup('revoice-icon-folder');
        shouldRenderAnSVGElement();
    });

    describe('Cog6ToothIconComponent', () => {
        setup('revoice-icon-cog-6');
        shouldRenderAnSVGElement();
    });

    describe('UsersIconComponent', () => {
        setup('revoice-icon-users');
        shouldRenderAnSVGElement();
    });

    describe('InformationIconComponent', () => {
        setup('revoice-icon-information');
        shouldRenderAnSVGElement();
    });

    describe('SwatchIconComponent', () => {
        setup('revoice-icon-swatch');
        shouldRenderAnSVGElement();
    });

    describe('CircleXIconComponent', () => {
        setup('revoice-icon-circle-x');
        shouldRenderAnSVGElement();
    });

    describe('EnvelopeIconComponent', () => {
        setup('revoice-icon-envelope');
        shouldRenderAnSVGElement();
    });

    describe('ArrowPointingIn', () => {
        setup('revoice-icon-arrow-in');
        shouldRenderAnSVGElement();
    });

    describe('SpeakerIconComponent', () => {
        setup('revoice-icon-speaker');
        shouldRenderAnSVGElement();
    });

    describe('SpeakerXIconComponent', () => {
        setup('revoice-icon-speaker-x');
        shouldRenderAnSVGElement();
    });

    describe('EmojiIconComponent', () => {
        setup('revoice-icon-emoji');
        shouldRenderAnSVGElement();
    });

    describe('UserIconComponent', () => {
        setup('revoice-icon-user');
        shouldRenderAnSVGElement();
    });

    describe('RoleIconComponent', () => {
        setup('revoice-icon-role');
        shouldRenderAnSVGElement();
    });

    describe('PaperClipIconComponent', () => {
        setup('revoice-icon-paper-clip');
        shouldRenderAnSVGElement();
    });

    describe('LogoutIconComponent', () => {
        setup('revoice-icon-logout');
        shouldRenderAnSVGElement();
    });

    describe('MenuBurgerIconComponent', () => {
        setup('revoice-icon-menu-burger');
        shouldRenderAnSVGElement();
    });

    describe('CameraIconComponent', () => {
        setup('revoice-icon-camera');
        shouldRenderAnSVGElement();
    });

    describe('DisplayIconComponent', () => {
        setup('revoice-icon-display');
        shouldRenderAnSVGElement();
    });

    describe('LanguageIconComponent', () => {
        setup('revoice-icon-language');
        shouldRenderAnSVGElement();
    });

    describe('StopComponent', () => {
        setup('revoice-icon-stop');
        shouldRenderAnSVGElement();
    });
});
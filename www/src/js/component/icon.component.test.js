const { beforeEach, afterEach, describe, expect, test} = require('@jest/globals');
const [
    PencilIconComponent,
    TrashIconComponent,
    ChatBubbleIconComponent,
    PhoneIconComponent,
    PhoneXIconComponent,
    MicrophoneIconComponent,
    ClipboardIconComponent,
    CirclePlusIconComponent,
    FolderPlusIconComponent,
    EyeOpenIconComponent,
    FolderIconComponent,
    Cog6ToothIconComponent,
    UsersIconComponent,
    InformationIconComponent,
    SwatchIconComponent,
    CircleXIconComponent,
    EnvelopeIconComponent,
    ArrowPointingIn,
    SpeakerIconComponent,
    SpeakerXIconComponent,
    EmojiIconComponent,
    UserIconComponent,
    RoleIconComponent,
    PaperClipIconComponent
] = require('./icon.component.js');


function setup(newIcon) {
    beforeEach(() => {
        const icon = newIcon();
        const component = document.createElement("div");
        component.innerHTML = icon.innerHTML;
        document.body.appendChild(component);
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
        setup(() => new TrashIconComponent());
        shouldRenderAnSVGElement()
    });

    describe('PencilIconComponent', () => {
        setup(() => new PencilIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('ChatBubbleIconComponent', () => {
        setup(() => new ChatBubbleIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('PhoneIconComponent', () => {
        setup(() => new PhoneIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('PhoneXIconComponent', () => {
        setup(() => new PhoneXIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('MicrophoneIconComponent', () => {
        setup(() => new MicrophoneIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('ClipboardIconComponent', () => {
        setup(() => new ClipboardIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('CirclePlusIconComponent', () => {
        setup(() => new CirclePlusIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('FolderPlusIconComponent', () => {
        setup(() => new FolderPlusIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('EyeOpenIconComponent', () => {
        setup(() => new EyeOpenIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('FolderIconComponent', () => {
        setup(() => new FolderIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('Cog6ToothIconComponent', () => {
        setup(() => new Cog6ToothIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('UsersIconComponent', () => {
        setup(() => new UsersIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('InformationIconComponent', () => {
        setup(() => new InformationIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('SwatchIconComponent', () => {
        setup(() => new SwatchIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('CircleXIconComponent', () => {
        setup(() => new CircleXIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('EnvelopeIconComponent', () => {
        setup(() => new EnvelopeIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('ArrowPointingIn', () => {
        setup(() => new ArrowPointingIn());
        shouldRenderAnSVGElement();
    });

    describe('SpeakerIconComponent', () => {
        setup(() => new SpeakerIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('SpeakerXIconComponent', () => {
        setup(() => new SpeakerXIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('EmojiIconComponent', () => {
        setup(() => new EmojiIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('UserIconComponent', () => {
        setup(() => new UserIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('RoleIconComponent', () => {
        setup(() => new RoleIconComponent());
        shouldRenderAnSVGElement();
    });

    describe('PaperClipIconComponent', () => {
        setup(() => new PaperClipIconComponent());
        shouldRenderAnSVGElement();
    });
});

export default class Alert {
    #userSettings;
    #defaultSounds = {
        messageNew: 'src/audio/messageNew.ogg',
        voiceUserJoin: 'src/audio/userJoinMale.mp3',
        voiceUserLeft: 'src/audio/userLeftMale.mp3',
        voiceConnected: 'src/audio/userConnectedMale.mp3',
        voiceDisconnected: 'src/audio/userDisconnectedMale.mp3',
        microphoneMuted: 'src/audio/microphoneMutedMale.mp3',
        microphoneActivated: 'src/audio/microphoneActivatedMale.mp3',
        soundMuted: 'src/audio/soundMutedMale.mp3',
        soundActivated: 'src/audio/soundActivatedMale.mp3',
    }
    #testSounds = {
        notification: 'src/audio/tryNotificationMale.mp3',
        voiceChat: 'src/audio/tryVoiceChatMale.mp3',
    }

    constructor(userSettings) {
        this.#userSettings = userSettings;
    }

    attachEvents(){
        document.getElementById("audio-output-try-voicechat").addEventListener('click', () => this.#playTest('voiceChat'));
        document.getElementById("audio-output-try-notification").addEventListener('click', () => this.#playTest('notification'));
    }

    play(type) {
        if (!this.#defaultSounds[type]) {
            console.error('Notification type is null or undefined');
        }

        let audio = new Audio(this.#defaultSounds[type]);
        audio.volume = this.#userSettings.getNotificationVolume();
        audio.play();
    }

    #playTest(type) {
        if (!this.#testSounds[type]) {
            console.error('Notification type is null or undefined');
        }

        let audio = new Audio(this.#testSounds[type]);

        switch(type){
            case 'notification':
                audio.volume = this.#userSettings.getNotificationVolume();
                break;
            case 'voiceChat':
                audio.volume = this.#userSettings.getVoiceVolume();
                break;
        }

        audio.play();
    }
}
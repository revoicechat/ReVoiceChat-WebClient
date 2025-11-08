export default class Alert {
    #userSettings;
    #defaultSounds = {
        messageNew: 'src/audio/messageNew.ogg',
        voiceUserJoin: 'src/audio/userJoinMale.mp3',
        voiceUserLeft: 'src/audio/userLeftMale.mp3',
        voiceConnected: 'src/audio/userConnectedMale.mp3',
        voiceDisconnected: 'src/audio/userDisconnectedMale.mp3',
        microphoneMuted: 'src/audio/microphoneMutedMale.mp3',
        microphoneActivated: 'src/audio/microphoneActivatedMale.mp3'
    }

    constructor(userSettings){
        this.#userSettings = userSettings;
    }

    play(type) {
        if (!this.#defaultSounds[type]) {
            console.error('Notification type is null or undefined');
        }

        let audio = new Audio(this.#defaultSounds[type]);
        audio.volume = this.#userSettings.getNotificationVolume();
        audio.play();
    }
}
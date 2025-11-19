import Stream from "./stream.js";

export default class StreamController {
    #streamUrl;
    #token;
    #streamer = [];
    #viewer = [];
    #room;
    #user;

    constructor(fetcher, alert, user, room, token, streamUrl) {
        this.#streamUrl = streamUrl;
        this.#token = token;
        this.#room = room;
        this.#user = user;
    }

    async startStream(type) {
        try {
            const streamerId = this.#streamer.push(new Stream(this.#streamUrl, this.#user, this.#token, this.#room.id));
            await this.#streamer[streamerId - 1].start(streamerId, type);
            console.log(`StreamerId : ${streamerId}`);
        }
        catch (error) {
            console.error(error);
        }
    }

    async joinStream(userId, streamName){
        const viewerId = this.#viewer.push(new Stream(this.#streamUrl, this.#user, this.#token, this.#room.id));
        await this.#viewer[viewerId - 1].join(userId, streamName);
        console.log(`ViewerId : ${viewerId}`);
    }
}
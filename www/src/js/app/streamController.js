export default class StreamController{
    #streamUrl;
    #token;

    constructor(fetcher, alert, user, room, token, streamUrl){
        this.#streamUrl = streamUrl;
        this.#token = token;
    }


}
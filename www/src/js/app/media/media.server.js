import {apiFetch} from "../../lib/tools.js";

export default class MediaServer {
    /** @type {MediaServer} */
    static #instance

    /** @param {URL} core */
    static init(core) {
        MediaServer.#instance = new MediaServer(core);
    }

    /** @param {URL} core */
    constructor(core) {
        this.url = `${core.protocol}//${core.host}/media`;
    }

    /**
     * @param {string} id
     * @return {string}
     */
    static profiles(id) {
        return `${MediaServer.#instance.url}/profiles/${id}?t=${Date.now()}`
    }

    /**
     * @param {string} id
     * @return {string}
     */
    static emote(id) {
        return `${MediaServer.#instance.url}/emote/${id}?t=${Date.now()}`
    }

    /**
     * @param {string} id
     * @return {string}
     */
    static attachments(id) {
        return `${MediaServer.#instance.url}/attachments/${id}?t=${Date.now()}`
    }

    /**
     * @param {string} path
     * @param {HTTPMethod} method
     * @param {*} rawData
     * @param {boolean} timeout
     * @return {Promise<null|any|boolean>}
     */
    static async fetch(path, method = 'GET', rawData = null, timeout = true) {
        if (method === null) {
            method = 'GET';
        }

        let signal = null;

        if(timeout){
            signal = AbortSignal.timeout(5000);
        }

        try {
            const response = await apiFetch(MediaServer.#instance.url + path, {
                method: method,
                signal: signal,
                headers: {
                    'Authorization': `Bearer ${RVC.getToken()}`
                },
                body: rawData
            });

            if (method !== "DELETE") {
                const contentType = response.headers.get("content-type");

                if (contentType?.includes("application/json")) {
                    return await response.json();
                }
            }

            return response.ok;
        }
        catch (error) {
            console.error(`fetchMedia: An error occurred while processing request \n${error}\nHost: ${(MediaServer.#instance.url)}\nPath: ${path}\nMethod: ${method}`);
            return null;
        }
    }
}
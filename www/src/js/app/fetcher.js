/**
 * @typedef {"GET"|"POST"|"PATCH"|"PUT"|"DELETE"|"OPTION"} HTTPMethod
 */

export default class Fetcher {
    #coreURL;
    #mediaURL;
    #token;

    /**
     * @param {string} token
     * @param {string} coreURL
     * @param {string} mediaURL
     */
    constructor(token, coreURL, mediaURL) {
        this.#coreURL = coreURL;
        this.#mediaURL = mediaURL;
        this.#token = token;
    }

    /**
     * @param {string} path
     * @param {HTTPMethod} method
     * @param {*} data
     * @return {Promise<null|any|boolean>}
     */
    async fetchCore(path, method = "GET", data = null) {
        if (method === null) {
            method = 'GET';
        }

        if (data) {
            data = JSON.stringify(data);
        }

        try {
            const response = await apiFetch(`${this.#coreURL}/api${path}`, {
                method: method,
                signal: AbortSignal.timeout(5000),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.#token}`
                },
                body: data
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
            console.error(`fetchCore: An error occurred while processing request \n${error}\nHost: ${this.#coreURL}\nPath: ${path}\nMethod: ${method}`);
            return null;
        }
    }

    /**
     * @param {string} path
     * @param {HTTPMethod} method
     * @param {*} rawData
     * @param {boolean} timeout
     * @return {Promise<null|any|boolean>}
     */
    async fetchMedia(path, method = 'GET', rawData = null, timeout = true) {
        if (method === null) {
            method = 'GET';
        }

        let signal = null;
        
        if(timeout){
            signal = AbortSignal.timeout(5000);
        }

        try {
            const response = await apiFetch(`${this.#mediaURL}${path}`, {
                method: method,
                signal: signal,
                headers: {
                    'Authorization': `Bearer ${this.#token}`
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
            console.error(`fetchMedia: An error occurred while processing request \n${error}\nHost: ${this.#mediaURL}\nPath: ${path}\nMethod: ${method}`);
            return null;
        }
    }
}

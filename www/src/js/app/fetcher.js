export default class Fetcher {
    #coreURL;
    #mediaURL;
    #token;

    constructor(token, coreURL, mediaURL) {
        this.#coreURL = coreURL;
        this.#mediaURL = mediaURL;
        this.#token = token;
    }

    async fetchCore(path, method = null, data = null) {
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

    async fetchMedia(path, method = null, rawData = null) {
        if (method === null) {
            method = 'GET';
        }

        try {
            const response = await apiFetch(`${this.#mediaURL}${path}`, {
                method: method,
                signal: AbortSignal.timeout(5000),
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

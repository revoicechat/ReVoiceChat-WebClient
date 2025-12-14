/**
 * @typedef {"GET"|"POST"|"PATCH"|"PUT"|"DELETE"|"OPTION"} HTTPMethod
 */
import {apiFetch} from "../lib/tools.js";

export default class Fetcher {
    #coreURL;

    /**
     * @param {string} coreURL
     */
    constructor(coreURL) {
        this.#coreURL = coreURL;
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
                    'Authorization': `Bearer ${RVC.getToken()}`
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
}

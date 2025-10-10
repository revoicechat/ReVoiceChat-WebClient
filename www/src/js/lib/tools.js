const sanitizeString = (str) => str.substring(0, 2000).trim();

function isToday(date) {
    const today = new Date();
    return today.getFullYear() === date.getFullYear() && today.getMonth() === date.getMonth() && today.getDate() === date.getDate();
}

function timestampToText(timestamp) {
    // By default timestamp is UTC (shouldn't matter for this function)
    timestamp = new Date(`${timestamp}`);
    let formatedTimestamp = timestamp.toLocaleString();
    formatedTimestamp = formatedTimestamp.substring(0, formatedTimestamp.length - 3);
    // Is today ?
    if (isToday(timestamp)) {
        formatedTimestamp = String(timestamp.getHours()).padStart(2, '0') + ":" + String(timestamp.getMinutes()).padStart(2, '0');
    }
    return formatedTimestamp;
}

function getQueryVariable(variable) {
    const query = window.location.search.substring(1);
    const vars = query.split("&");
    for (const element of vars) {
        const pair = element.split("=");
        if (pair[0] === variable) {
            return pair[1];
        }
    }
    return null;
}

async function fetchCoreAPI(path, method = null, data = null) {
    if (method === null) {
        method = 'GET';
    }

    if (data) {
        data = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${global.url.core}/api${path}`, {
            method: method,
            signal: AbortSignal.timeout(5000),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${global.jwtToken}`
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
        console.error(`fetchCoreAPI: An error occurred while processing request \n${error}\nHost: ${global.url.core}\nPath: ${path}\nMethod: ${method}`);
        return null;
    }
}

async function fetchMedia(path, method = null) {
    if (method === null) {
        method = 'GET';
    }

    try {
        const response = await fetch(`${global.url.core}/media${path}`, {
            method: method,
            signal: AbortSignal.timeout(5000),
            headers: {
                'Authorization': `Bearer ${global.jwtToken}`
            }
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
        console.error(`fetchMedia: An error occurred while processing request \n${error}\nHost: ${global.url.core}\nPath: ${path}\nMethod: ${method}`);
        return null;
    }
}

async function fileExistMedia(path) {
    try {
        const response = await fetch(`${global.url.media}${path}`, {
            method: 'POST',
            signal: AbortSignal.timeout(5000),
        });

        if (response.status === 200) {
            return true;
        }

        if (response.status === 204) {
            return false;
        }

        throw new Error(`Invalid response status: ${response.status}`);
    }
    catch (error) {
        console.error(`An error occurred while processing your request \n${error}\nHost : ${global.url.media}\nPath : ${path}`);
        return null;
    }
}
// Save a cookie
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
}

// Read a cookie
function getCookie(name) {
    const nameEQ = name + "=";
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
        let cookie = c.trim()
        if (cookie.startsWith(nameEQ)) {
            return decodeURIComponent(cookie.substring(nameEQ.length));
        }
    }
    return null;
}

// Delete a cookie
function eraseCookie(name) {
    document.cookie = name + "=; Max-Age=-99999999; path=/";
}

function sseClose() {
    if (global.sse !== null) {
        global.sse.close();
        global.sse = null;
    }
}

async function copyToClipboard(data) {
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(data);
            console.log('Content copied to clipboard');
        }
        else {
            // Fallback
            const input = document.createElement('input');
            input.id = 'input-copy'
            input.value = data;
            document.body.appendChild(input);
            document.getElementById('input-copy').select();
            document.execCommand("copy");
            input.remove();
            console.log('Content copied to clipboard (fallback)');
        }
    } catch (err) {
        console.error('copyToClipboard: Failed to copy:', err);
    }
}

function getGlobal() {
    return global;
}

/**
 * Format bytes as human-readable text.
 * 
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use 
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 * 
 * @return Formatted string.
 */
function humanFileSize(bytes, si = false, dp = 1) {
    const thresh = si ? 1000 : 1024;

    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }

    const units = si
        ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    let u = -1;
    const r = 10 ** dp;

    do {
        bytes /= thresh;
        ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


    return bytes.toFixed(dp) + ' ' + units[u];
}
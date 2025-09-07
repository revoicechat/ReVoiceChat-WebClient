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

async function getCoreAPI(path) {
    try {
        const response = await fetch(`${global.url.core}/api${path}`, {
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
            headers: {
                'Content-Type': 'application/json',
                'Authorization' : `Bearer ${global.jwtToken}`
            },
        });

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        return await response.json();
    }
    catch (error) {
        console.error(`An error occurred while processing your request \n${error}\nHost : ${global.url.core}\nPath : ${path}`);
        return null;
    }
}

const putCoreAPI = async (path, data) => fetchCoreAPI(path, data , 'PUT');

const patchCoreAPI = async (path, data) => fetchCoreAPI(path, data , 'PATCH');

async function fetchCoreAPI(path, data, method) {
    if(data){
        data = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${global.url.core}/api${path}`, {
            method: method,
            signal: AbortSignal.timeout(5000),
            headers: {
                'Content-Type': 'application/json',
                'Authorization' : `Bearer ${global.jwtToken}`
            },
            body: data
        });

        const contentType = response.headers.get("content-type");

        if (contentType?.includes("application/json")) {
            return await response.json();
        }

        return response.ok;
    }
    catch (error) {
        console.error(`An error occurred while processing your request \n${error}\nHost : ${global.url.core}\nPath : ${path}`);
        return null;
    }
}

async function deleteCoreAPI(path) {
    try {
        const response = await fetch(`${global.url.core}/api${path}`, {
            method: 'DELETE',
            signal: AbortSignal.timeout(5000),
            headers: {
                'Content-Type': 'application/json',
                'Authorization' : `Bearer ${global.jwtToken}`
            }
        });

        return response.ok;
    }
    catch (error) {
        console.error(`An error occurred while processing your request \n${error}\nHost : ${global.url.core}\nPath : ${path}`);
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

async function fileBulkExistMedia(path, data){
    try {
        const response = await fetch(`${global.url.media}${path}`, {
            method: 'POST',
            signal: AbortSignal.timeout(5000),
            body: JSON.stringify(data)
        });

        if(!response.ok){
            throw new Error("Not OK");
        }

        return await response.json();
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
        if (c.trim().startsWith(nameEQ)) {
            return decodeURIComponent(c.substring(nameEQ.length));
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

function packetEncode(header, data) {
    const headerBytes = new TextEncoder().encode(header);

    // Calculate length of packet
    const packetLength = 2 + headerBytes.length + data.byteLength;

    // Create packet of that length
    const packet = new Uint8Array(packetLength);

    // Fill packet
    const view = new DataView(packet.buffer);
    view.setUint16(0, headerBytes.length);
    packet.set(headerBytes, 2);
    packet.set(new Uint8Array(data), 2 + headerBytes.length);

    return packet;
}

function packetDecode(packet) {
    const data = packet.data;
    const view = new DataView(data);

    const headerEnd = 2 + view.getUint16(0);
    const headerBytes = new Uint8Array(data.slice(2, headerEnd));
    const headerJSON = new TextDecoder().decode(headerBytes);

    const result = { header: null, data: null };
    result.header = JSON.parse(headerJSON);
    result.data = data.slice(headerEnd);

    return result;
}
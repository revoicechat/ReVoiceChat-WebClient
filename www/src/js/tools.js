function sanitizeString(str) {
    str = str.substring(0, 2000);
    //str = str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim, "");
    return str.trim();
}

function isToday(date) {
    const today = new Date();
    return today.getFullYear() == date.getFullYear() && today.getMonth() == date.getMonth() && today.getDate() == date.getDate();
}

function timestampToText(timestamp) {
    // By default timestamp is UTC (shouldn't matter for this function)
    timestamp = new Date(`${timestamp}`);

    /*
    let current = new Date().getTime();
    let elpase = parseInt((current - timestamp) / 1000); // Elpase time in seconds
    // Less than a minute
    if (elpase < 60) {
        return "Now";
    }

    // Less than an hour
    if (elpase < 3600) {
        let minutes = parseInt(elpase / 60);
        if (minutes == 1) {
            return "1 minute ago";
        }
        return `${minutes} minutes ago`;
    }

    // Less than a day
    if (elpase < 86400) {
        let hours = parseInt(elpase / 3600);
        if (hours == 1) {
            return "1 hour ago";
        }
        return `${hours} hours ago`;
    }
    */

    formatedTimestamp = timestamp.toLocaleString();
    formatedTimestamp = formatedTimestamp.substring(0, formatedTimestamp.length - 3);

    // Is today ?
    if (isToday(timestamp)) {
        formatedTimestamp = String(timestamp.getHours()).padStart(2, '0') + ":" + String(timestamp.getMinutes()).padStart(2, '0');
    }

    return formatedTimestamp;
}

function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) {
            return pair[1];
        }
    }
    return false;
}

async function getCoreAPI(path) {
    try {
        const response = await fetch(`${current.url.core}/api${path}`, {
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization' : `Bearer ${current.jwtToken}`
            },
        });

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        return await response.json();
    }
    catch (error) {
        console.error(`An error occurred while processing your request \n${error}\nHost : ${current.url.core}\nPath : ${path}`);
        return null;
    }
}

async function putCoreAPI(path, data) {
    try {
        const response = await fetch(`${current.url.core}/api${path}`, {
            method: 'PUT',
            credentials: 'include',
            signal: AbortSignal.timeout(5000),
            headers: {
                'Content-Type': 'application/json',
                'Authorization' : `Bearer ${current.jwtToken}`
            },
            body: JSON.stringify(data)
        });

        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
            return await response.json();
        }

        return response.ok;
    }
    catch (error) {
        console.error(`An error occurred while processing your request \n${error}\nHost : ${current.url.core}\nPath : ${path}`);
        return null;
    }
}

async function patchCoreAPI(path, data) {
    try {
        const response = await fetch(`${current.url.core}/api${path}`, {
            method: 'PATCH',
            credentials: 'include',
            signal: AbortSignal.timeout(5000),
            headers: {
                'Content-Type': 'application/json',
                'Authorization' : `Bearer ${current.jwtToken}`
            },
            body: JSON.stringify(data)
        });

        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
            return await response.json();
        }

        return response.ok;
    }
    catch (error) {
        console.error(`An error occurred while processing your request \n${error}\nHost : ${current.url.core}\nPath : ${path}`);
        return null;
    }
}

async function deleteCoreAPI(path) {
    try {
        const response = await fetch(`${current.url.core}/api${path}`, {
            method: 'DELETE',
            credentials: 'include',
            signal: AbortSignal.timeout(5000),
            headers: {
                'Content-Type': 'application/json',
                'Authorization' : `Bearer ${current.jwtToken}`
            }
        });

        return response.ok;
    }
    catch (error) {
        console.error(`An error occurred while processing your request \n${error}\nHost : ${current.url.core}\nPath : ${path}`);
        return null;
    }
}

async function fileExistMedia(path) {
    try {
        const response = await fetch(`${current.url.media}${path}`, {
            method: 'OPTIONS',
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
        console.error(`An error occurred while processing your request \n${error}\nHost : ${current.url.media}\nPath : ${path}`);
        return null;
    }
}

async function fileBulkExistMedia(path, files){
    try {
        const response = await fetch(`${current.url.media}${path}`, {
            method: 'OPTIONS',
            signal: AbortSignal.timeout(5000),
        });

        if(!response.ok){
            throw "Not OK";
        }

        return await response.json();
    }
    catch (error) {
        console.error(`An error occurred while processing your request \n${error}\nHost : ${current.url.media}\nPath : ${path}`);
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
        c = c.trim();
        if (c.indexOf(nameEQ) === 0) {
            return decodeURIComponent(c.substring(nameEQ.length));
        }
    }
    return null;
}

// Delete a cookie
function eraseCookie(name) {
    document.cookie = name + "=; Max-Age=-99999999; path=/";
}
function sanitizeString(str) {
    str = str.substring(0, 2000);
    //str = str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim, "");
    return str.trim();
}

function timestampToText(timestamp) {
    // By default timestamp is UTC (shouldn't matter for this function)
    timestamp = new Date(`${timestamp}Z`);

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

    timestamp = timestamp.toLocaleString();

    return timestamp.substring(0, timestamp.length - 3);
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

async function getRequestToHost(path) {
    try {
        const response = await fetch(`${current.host}${path}`, {
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        return await response.json();
    }
    catch (error) {
        console.error(`An error occurred while processing your request \n${error}\nHost : ${current.host}\nPath : ${path}`);
        return null;
    }
}

async function putRequestToHost(path, data) {
    try {
        const response = await fetch(`${current.host}${path}`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        return response.ok;
    }
    catch (error) {
        console.error(`An error occurred while processing your request \n${error}\nHost : ${current.host}\nPath : ${path}`);
        return null;
    }
}
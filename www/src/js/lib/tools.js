const tauriActive = typeof window.__TAURI__ !== 'undefined';

const SwalCustomClass = {
    title: "swalTitle",
    popup: "swalPopup",
    cancelButton: "swalCancel",
    confirmButton: "swalConfirm",
}

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

// Save a cookie
function setCookie(name, value, days) {
    if (tauriActive) {
        const data = {
            value: value,
            expires: days ? Date.now() + (days * 24 * 60 * 60 * 1000) : null
        };
        localStorage.setItem(`secure_${name}`, JSON.stringify(data));
    } else {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/; SameSite=Strict";
    }
}

// Read a cookie
function getCookie(name) {
    if (tauriActive) {
        const stored = localStorage.getItem(`secure_${name}`);
        if (!stored) return null;

        try {
            const data = JSON.parse(stored);
            if (data.expires && Date.now() > data.expires) {
                localStorage.removeItem(`secure_${name}`);
                return null;
            }

            return data.value;
        } catch (e) {
            console.error('Error parsing stored data:', e);
            return null;
        }
    } else {
        const nameEQ = name + "=";
        const cookies = document.cookie.split(';');
        for (let c of cookies) {
            let cookie = c.trim();
            if (cookie.startsWith(nameEQ)) {
                return decodeURIComponent(cookie.substring(nameEQ.length));
            }
        }
        return null;
    }
}

// Delete a cookie
function eraseCookie(name) {
    if (tauriActive) {
        localStorage.removeItem(`secure_${name}`);
    } else {
        document.cookie = name + "=; Max-Age=-99999999; path=/";
    }
}

async function copyToClipboard(data) {
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(data);
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
        }
    } catch (err) {
        console.error('copyToClipboard: Failed to copy:', err);
    }
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

function statusToDotClassName(status) {
    switch (status) {
        case "ONLINE":
            return "user-dot-online";
        case "AWAY":
            return "user-dot-away";
        case "DO_NOT_DISTURB":
            return "user-dot-dnd";
        case "INVISIBLE":
        default:
            return "user-dot-offline";
    }
}

function createContextMenuButton(className, innerHTML, onclick, title = "") {
    const DIV = document.createElement('div');
    DIV.className = className;
    DIV.innerHTML = innerHTML;
    DIV.onclick = onclick;
    DIV.title = title;
    return DIV;
}
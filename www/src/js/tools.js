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
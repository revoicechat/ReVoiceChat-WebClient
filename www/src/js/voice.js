
function voiceJoin(roomId) {

}

function voiceLeave(roomId) {

}

async function voiceShowConnnectedUsers(roomId) {
    const result = await getCoreAPI(`/server/${current.server.id}/user`); // TO DO : Replace with actual Endpoint

    if (result === null) {
        console.info("VOICE : No user in room");
        return;
    }

    const sortedByDisplayName = [...result].sort((a, b) => {
        return a.displayName.localeCompare(b.displayName);
    });

    const VOICE_CONTENT = document.getElementById("voice-content");
    VOICE_CONTENT.innerHTML = "";

    let tempList = [];

    for (const i in sortedByDisplayName) {
        tempList.push(sortedByDisplayName[i].id);
    }

    const usersPfpExist = await fileBulkExistMedia("/profiles/bulk", tempList);

    for (const i in sortedByDisplayName) {
        VOICE_CONTENT.appendChild(voiceCreateJoinedUser(sortedByDisplayName[i], usersPfpExist ? [sortedByDisplayName[i].id] : false));
    }

    // Room is currently active
    if (current.voice.roomId === current.room.id) {
        voiceUpdateUsersControls();
    }
}

async function voiceUpdateUsersControls() {
    const result = await getCoreAPI(`/server/${current.server.id}/user`); // TO DO : Replace with actual Endpoint

    if (result === null) {
        console.info("VOICE : No user in room");
        return;
    }

    for (const i in result) {
        voiceUpdateUser(result[i].id);
    }
}

function voiceUpdateUser(userId) {

}

/* Those don't do shit yet, only show it */

function voiceControlVolume(userId, volumeInput) {
    volumeInput.title = volume * 100 + "%";
}

function voiceControlMute(userId, muteButton) {
    if (current.voice.users[userId].audio.muted) {
        muteButton.classList.remove('active');
    }
    else {
        muteButton.classList.add('active');
    }
}

function voiceControlSelfMute() {
    const mute = document.getElementById("voice-self-mute");

    if (current.voice.selfMute) {
        // Unmute
        console.info("VOICE : Self unmute");
        current.voice.selfMute = false;
        mute.classList.remove('active');
    }
    else {
        // Mute
        console.info("VOICE : Self mute");
        current.voice.selfMute = true;
        mute.classList.add('active');
    }
}
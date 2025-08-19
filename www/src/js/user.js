async function getUsername() {
    const result = await getRequestToHost(`/user/me`);

    if (result !== null) {
        current.user.id = result.id;
        document.getElementById("user-name").innerText = result.username;
        document.getElementById("user-status").innerText = result.status;
        document.getElementById("user-picture").src = `https://media.revoicechat.fr/profiles/${result.id}`;
    }
}
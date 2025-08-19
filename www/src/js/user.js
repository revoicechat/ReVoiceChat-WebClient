async function getUsername() {
    const result = await getRequestOnCore(`/user/me`);

    if (result !== null) {
        current.user = result;

        document.getElementById("user-name").innerText = result.displayName;
        document.getElementById("user-status").innerText = result.status;

        if (await fileExistOnMedia(`/profiles/${result.id}`)) {
            document.getElementById("user-picture").src = `${current.mediaUrl}/profiles/${result.id}`;
        }
    }
}
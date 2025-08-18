async function getUsername() {
    const result = await getRequestToHost(`/user/me`);

    if (result !== null) {
        document.getElementById("user-name").innerText = result.username;
        document.getElementById("user-status").innerText = result.status;
    }
}
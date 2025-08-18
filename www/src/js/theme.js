document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.setAttribute("data-theme", localStorage.getItem("Theme") || "default");
});

function changeTheme() {
    Swal.fire({
        icon: "question",
        title: `Change the theme`,
        html: `
            <form id='swal-form'>
                <select name='theme' id='theme'>
                    <option value='default'>Default</option>
                    <option value='dark'>Dark</option>
                </select>
            </form>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: `Select`,
        cancelButtonText: `Cancel`,
        didOpen: () => {
            document.getElementById("theme").value = localStorage.getItem("Theme");
        }
    }).then((result) => {
        if (result.value) {
            const root = document.documentElement;
            const theme = document.getElementById("swal-form").theme.value;
            localStorage.setItem("Theme", theme);
            root.setAttribute("data-theme", theme);
        }
    })
}
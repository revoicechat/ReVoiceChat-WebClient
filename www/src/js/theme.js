document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.setAttribute("data-theme", localStorage.getItem("Theme") || "default");
});

function changeTheme() {
    Swal.fire({
        icon: "question",
        title: `Change the theme`,
        html: `
            <form id='swal-form'>
                <select name='theme' id='theme' onchange=previewTheme(this.value)>
                    <option value='default'>Default</option>
                    <option value='dark'>Dark</option>
                </select>
            </form>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: `Apply`,
        cancelButtonText: `Cancel`,
        didOpen: () => {
            document.getElementById("theme").value = localStorage.getItem("Theme");
        }
    }).then((result) => {
        const root = document.documentElement;
        root.setAttribute("data-theme", localStorage.getItem("Theme") || "default");

        if (result.value) {
            const theme = document.getElementById("swal-form").theme.value;
            localStorage.setItem("Theme", theme);
            root.setAttribute("data-theme", theme);
        }
    })
}

function previewTheme(value) {
    document.documentElement.setAttribute("data-theme", value);
}
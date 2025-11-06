export default class ServerSettingsController {
    #server;
    #fetcher;
    #currentTab;

    constructor(server, fetcher) {
        this.#server = server;
        this.#fetcher = fetcher;

        // Load
        this.#overviewLoad();
        this.#invitationLoad();

        // Events
        this.#selectEventHandler();
        this.#overviewEventHandler();
        this.#invitationEventHandler();

        this.#select('overview');
    }

    #select(name) {
        if (this.#currentTab) {
            document.getElementById(`server-setting-tab-${this.#currentTab}`).classList.remove("active");
            document.getElementById(`server-setting-content-${this.#currentTab}`).classList.add("hidden");
        }

        this.#currentTab = name;
        document.getElementById(`server-setting-tab-${this.#currentTab}`).classList.add('active');
        document.getElementById(`server-setting-content-${this.#currentTab}`).classList.remove('hidden');
    }

    #selectEventHandler() {
        const parameters = ['overview', 'rooms', 'roles', 'emotes', 'members', 'invitations'];
        for (const param of parameters) {
            document.getElementById(`server-setting-tab-${param}`).addEventListener('click', () => this.#select(param));
        }
    }

    // OVERVIEW
    #overviewLoad() {
        document.getElementById('server-setting-overview-uuid').innerText = this.#server.id;
        document.getElementById('server-setting-overview-name').value = this.#server.name;
    }

    #overviewEventHandler(){
        document.getElementById(`server-setting-overview-save`).addEventListener('click', () => this.#overviewSave());
    }

    async #overviewSave() {
        const spinner = new SpinnerOnButton("server-setting-overview-save")
        spinner.run()
        await this.#nameUpdate()
        spinner.success()
    }

    async #nameUpdate() {
        const serverName = document.getElementById("server-setting-overview-name").value;

        if (!serverName) {
            spinner.error();
            Swal.fire({
                icon: 'error',
                title: `Server name invalid`,
                animation: false,
                customClass: SwalCustomClass,
                showCancelButton: false,
                confirmButtonText: "OK",
                allowOutsideClick: false,
            });
            return;
        }

        const result = await this.#fetcher.fetchCore(`/server/${this.#server.id}`, 'PATCH', { name: serverName })
        if (result) {
            this.#server.name = result.name;
            this.#overviewLoad();
        }
    }

    // INVITATION
    #invitationEventHandler() {
        document.getElementById('server-setting-invitation-create').addEventListener('click', () => this.#invitationCreate());
    }

    async #invitationLoad() {
        const serverId = this.#server.id;
        const result = await this.#fetcher.fetchCore(`/invitation/server/${serverId}`, 'GET');

        if (result) {
            const list = document.getElementById("config-invitations-list");
            list.innerHTML = "";

            for (const invitation of result) {
                if (invitation.status === 'CREATED') {
                    list.appendChild(await this.#invitationCreateItem(invitation));
                }
            }
        }
    }

    async #invitationCreate() {
        const serverId = this.#server.id;
        const result = await this.#fetcher.fetchCore(`/invitation/server/${serverId}`, 'POST');
        if (result.status === "CREATED") {
            this.#invitationLoad();
            Swal.fire({
                title: `New invitation`,
                html: `<input class='swal-input' type='text' value='${result.id}' readonly>`,
                animation: false,
                customClass: SwalCustomClass,
                showCancelButton: false,
                confirmButtonText: "OK",
                allowOutsideClick: false,
            })
        }
    }

    #invitationCreateItem(data) {
        const DIV = document.createElement('div');
        DIV.id = data.id;
        DIV.className = "config-item";

        // Name
        const DIV_NAME = document.createElement('div');
        DIV_NAME.className = "name invitation";
        DIV_NAME.innerText = `${data.id} (${data.status})`;
        DIV.appendChild(DIV_NAME);

        // Context menu
        const DIV_CM = document.createElement('div');
        DIV_CM.className = "context-menu";
        DIV_CM.appendChild(createContextMenuButton("icon", "<revoice-icon-clipboard></revoice-icon-clipboard>", () => this.#invitationCopy(data.id)));
        DIV_CM.appendChild(createContextMenuButton("icon", "<revoice-icon-trash></revoice-icon-trash>", () => this.#invitationDelete(data)));
        DIV.appendChild(DIV_CM);

        return DIV;
    }

    async #invitationDelete(data) {
        Swal.fire({
            title: `Delete invitation '${data.id}'`,
            animation: false,
            customClass: {
                title: "swalTitle",
                popup: "swalPopup",
                cancelButton: "swalConfirm",
                confirmButton: "swalCancel", // Swapped on purpose !
            },
            showCancelButton: true,
            focusCancel: true,
            confirmButtonText: "Delete",
            allowOutsideClick: false,
        }).then(async (result) => {
            if (result.value) {
                await this.#fetcher.fetchCore(`/invitation/${data.id}`, 'DELETE');
                this.#invitationLoad();
            }
        });
    }

    #invitationCopy(link) {
        const url = document.location.href.slice(0, -11) + `index.html?register=&invitation=${link}&host=${RVC.coreUrl}`;
        copyToClipboard(url);
    }
}
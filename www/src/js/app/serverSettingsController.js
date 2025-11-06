export default class ServerSettingsController {
    #server;
    #fetcher;
    #currentTab;
    #mediaUrl;
    #coreUrl;

    constructor(server, fetcher, mediaUrl) {
        this.#server = server;
        this.#fetcher = fetcher;
        this.#mediaUrl = mediaUrl;

        // Load
        this.#overviewLoad();
        this.#rolesLoad();
        this.#emotesLoad();
        this.#invitationLoad();
        this.#memberLoad();

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

    #overviewEventHandler() {
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

    // ROLES
    #rolesLoad() {
        document.getElementById("server-setting-roles-component").setAttribute("server-id", this.#server.id)
    }

    // EMOTES
    async #emotesLoad() {
        const response = await this.#fetcher.fetchCore(`/emote/server/${this.#server.id}`);
        document.getElementById("server-setting-content-emotes").innerHTML = `
            <h1>Emotes</h1>
            <revoice-emoji-manager path="server/${this.#server.id}" id="setting-emotes-form">
                <script type="application/json" slot="emojis-data">
                    ${JSON.stringify(response)}
                </script>
            </revoice-emoji-manager>`;
    }

    // MEMBERS
    async #memberLoad() {
        const result = await this.#fetcher.fetchCore(`/server/${this.#server.id}/user`, 'GET');

        if (result) {
            const sortedByDisplayName = [...result].sort((a, b) => {
                return a.displayName.localeCompare(b.displayName);
            });

            if (sortedByDisplayName !== null) {
                const userList = document.getElementById("server-setting-members");
                userList.innerHTML = "";
                for (const user of sortedByDisplayName) {
                    userList.appendChild(this.#memberItem(user));
                }
            }
        }
    }

    #memberItem(data) {
        const DIV = document.createElement('div');
        DIV.id = data.id;
        DIV.className = `${data.id} config-item`;

        const profilePicture = `${this.#mediaUrl}/profiles/${data.id}`;

        DIV.innerHTML = `
            <div class="relative">
                <img src="${profilePicture}" alt="PFP" class="icon ring-2" />
            </div>
            <div class="user">
                <div class="name" id="user-name">${data.displayName}<div>
            </div>
        `;

        return DIV;
    }

    // INVITATION
    #invitationEventHandler() {
        document.getElementById('server-setting-invitation-create').addEventListener('click', () => this.#invitationCreate());
    }

    async #invitationLoad() {
        const serverId = this.#server.id;
        const result = await this.#fetcher.fetchCore(`/invitation/server/${serverId}`, 'GET');

        if (result) {
            const list = document.getElementById("server-setting-invitation");
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

    #invitationDelete(data) {
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
        const url = document.location.href.slice(0, -11) + `index.html?register=&invitation=${link}&host=${this.#coreUrl}`;
        copyToClipboard(url);
    }
}
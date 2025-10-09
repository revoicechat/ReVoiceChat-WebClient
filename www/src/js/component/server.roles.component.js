class ServerRolesWebComponent extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.serverId = null
    }

    static get observedAttributes() {
        return ['server-id'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'server-id' && oldValue !== newValue) {
            this.#connectedCallback(newValue);
        }
    }

    connectedCallback() {
        const serverId = this.getAttribute("server-id")
        this.#connectedCallback(serverId);
    }

    #connectedCallback(serverId) {
        if (serverId) {
            this.serverId = serverId
            this.render();
            this.loadData();
        } else {
            this.shadowRoot.innerHTML = ``
        }
    }

    async loadData() {
        try {
            await Promise.all([
                this.fetchRoles(),
                this.fetchUsers(),
                this.fetchRisks()
            ]);
            this.renderRoles();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data');
        }
    }

    async fetchRoles() {
        this.roles = await fetchCoreAPI(`/server/${this.serverId}/role`);
    }

    async fetchUsers() {
        this.availableUsers = await fetchCoreAPI(`/server/${this.serverId}/user`);
    }

    async fetchRisks() {
        this.availableRisks = await fetchCoreAPI('/risk');
    }

    async createRoleAPI(roleData) {
        return await fetchCoreAPI(`/server/${this.serverId}/role`, 'PUT', roleData);
    }

    async updateRoleRisk(roleId, riskName, status) {
        await fetchCoreAPI(`/role/${roleId}/risk/${riskName}`, 'PATCH', status.toUpperCase());
    }

    render() {
        this.shadowRoot.innerHTML = `
            <link href="src/css/tailwind.css" rel="stylesheet" />
            <link href="src/css/main.css" rel="stylesheet" />
            <link href="src/css/emoji.css" rel="stylesheet" />
            <style>
                .role-settings-main {
                    display: flex;
                    width: max-content;
                }

                .role-settings-sidebar {
                    display: flex;
                    flex-direction: column;
                    width: 20rem;
                    height: -webkit-fill-available;
                    background-color: var(--sec-bg-color);
                }

                .config-item {
                    display: flex;
                    cursor: pointer;
                    align-items: center;
                }
                
                .role-priority {
                    font-size: 0.75rem;
                    color: #95a5a6;
                    padding-left: 0.75rem;
                }

                .room-container {
                    padding-left: 2rem;
                }

                .risk-category {
                    margin-bottom: 2rem;
                }

                .risk-category-header {
                    font-weight: 700;
                    padding-bottom: 0.5rem;
                }

                .risk-container {
                    display: grid;
                    gap: 0.75rem;
                }

                .risk-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem;
                    background-color: var(--pri-bg-color);
                    border-radius: 0.25rem;
                    border-left: 4px solid;
                    border-left-color: var(--pri-bd-color);
                }

                .risk-name {
                    padding-right: 10px;
                }

                .risk-toggle {
                    display: flex;
                    gap: 0.5rem;
                }

                .detail-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid #43434d;
                }

                .icon {
                    width: 3rem;
                    height: 3rem;
                    border-radius: 9999px;
                }

                .detail-header h2 { flex: 1;}

                .detail-priority {
                    font-size: 0.875rem;
                    color: #95a5a6;
                }

                .error-message {
                    background-color: rgb(220, 38, 38);
                    color: white;
                    padding: 1rem;
                    border-radius: 0.25rem;
                    margin: 1rem;
                    text-align: center;
                }
            </style>

            <div class="config config-right">            
                <div class="config-buttons">
                    <button class="btn-primary" id="createRoleBtn"><revoice-icon-circle-plus></revoice-icon-circle-plus> New</button>
                </div>
                <div class="role-settings-main">
                    <div class="role-settings-sidebar">
                        <div class="sidebar-room-container" id="rolesList"></div>
                    </div>
                    <div class="room">
                        <div class="room-container">
                            <div class="room-content" id="roleDetails">
                                <div class="empty-state">
                                    <h3>Select a role</h3>
                                    <p>Choose a role from the list to view and manage its risks</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const createBtn = this.shadowRoot.getElementById('createRoleBtn');
        createBtn.addEventListener('click', () => this.#newRole());
    }

    renderRoles() {
        const rolesList = this.shadowRoot.getElementById('rolesList');
        rolesList.innerHTML = this.roles
            .sort((a, b) => a.priority - b.priority)
            .map(role => `
                <div class="config-item ${this.selectedRoleId === role.id ? 'active' : ''}" data-role-id="${role.id}">
                    <div class="icon" style="background: ${role.color}"></div>
                    <div style="flex: 1;">
                        <div class="name">${role.name}</div>
                        <div class="role-priority">Priority: ${role.priority}</div>
                    </div>
                </div>
            `).join('');

        // Add click listeners
        for (const item of rolesList.querySelectorAll('.config-item')) {
            item.addEventListener('click', () => {
                const roleId = item.dataset.roleId;
                this.selectRole(roleId);
            });
        }
    }

    selectRole(roleId) {
        this.selectedRoleId = roleId;
        this.renderRoles();
        this.renderRoleDetails();
    }

    renderRoleDetails() {
        const role = this.roles.find(r => r.id === this.selectedRoleId);
        if (!role) return;
        const roleDetails = this.shadowRoot.getElementById('roleDetails');
        roleDetails.innerHTML = `
            <div class="detail-header">
                <div class="icon" style="background: ${role.color}"></div>
                <h2>${role.name}</h2>
                <div class="detail-priority">Priority: ${role.priority}</div>
                <div class="detail-priority"><button class="btn-primary" id="assigned-popup-button">Members: ${role.members.length}</button></div>
            </div>

            <div class="config-section">
                ${this.availableRisks.map(category => `
                    <div class="risk-category">
                        <div class="risk-category-header">${category.title}</div>
                        <div class="risk-container">
                            ${category.risks.map(risk => `
                                <div class="risk-item">
                                    <div class="risk-name">${risk.title}</div>
                                    <div class="risk-toggle">
                                        <button class="toggle-btn enabled ${this.#findRisk(role, risk)?.mode === 'ENABLE' ? 'active' : ''}" 
                                                data-role-id="${role.id}" data-risk="${risk.type}" data-status="ENABLE">
                                            Enabled
                                        </button>
                                        <button class="toggle-btn disabled ${this.#findRisk(role, risk)?.mode === 'DISABLE' ? 'active' : ''}" 
                                                data-role-id="${role.id}" data-risk="${risk.type}" data-status="DISABLE">
                                            Disabled
                                        </button>
                                        <button class="toggle-btn default ${(this.#findRisk(role, risk)?.mode === 'DEFAULT' || !this.#findRisk(role, risk)) ? 'active' : ''}" 
                                                data-role-id="${role.id}" data-risk="${risk.type}" data-status="DEFAULT">
                                            Default
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>`;

        // Add event listeners for risk toggles
        for (const btn of roleDetails.querySelectorAll('.toggle-btn')) {
            btn.addEventListener('click', async () => {
                const roleId = btn.dataset.roleId;
                const risk = btn.dataset.risk;
                const status = btn.dataset.status;
                await this.toggleRisk(roleId, risk, status);
            });
        }

        // Add event listeners for user toggles
        for (const item of roleDetails.querySelectorAll('.assigned-user-item')) {
            item.addEventListener('click', () => {
                const checkbox = item.querySelector("input")
                checkbox.checked = !checkbox.checked;
                if (checkbox.checked) {
                    item.classList.add("selected");
                } else {
                    item.classList.remove("selected");
                }
            });
        }

        roleDetails.querySelector("#assigned-popup-button").addEventListener('click', async () => {
            await this.#assignedUser(role)
        })
    }


    #findRisk(role, risk) {
        return role.risks.find(item => item.type === risk.type);
    }

    async toggleRisk(roleId, riskName, status) {
        try {
            await this.updateRoleRisk(roleId, riskName, status);
            await this.fetchRoles();
            this.renderRoleDetails();
        } catch (error) {
            console.error('Error updating risk:', error);
            this.showError('Failed to update risk');
        }
    }

    async #newRole() {
        Swal.fire({
            title: 'Create New Role',
            animation: false,
            customClass: {
                title: "swalTitle",
                popup: "swalPopup",
                cancelButton: "swalCancel",
                confirmButton: "swalConfirm",
                input: "assigned-user-checkbox"

            },
            showCancelButton: true,
            focusConfirm: false,
            confirmButtonText: "Add",
            allowOutsideClick: false,
            html: `
            <form class='popup'>
                <div class="server-structure-form-group">
                    <label for="roleName">Role Name</label>
                    <input type="text" id="roleName" placeholder="Enter role name">
                </div>
                <div class="server-structure-form-group">
                    <label for="roleColor">Color</label>
                    <input style="height: 2.5rem; padding: 0" type="color" id="roleColor" value="#5e8c61">
                </div>
                <div class="server-structure-form-group">
                    <label for="rolePriority">Priority</label>
                    <input type="number" id="rolePriority" placeholder="1" min="1">
                </div>
            </form>`,
            preConfirm: () => {
                const popup = Swal.getPopup();
                const name = popup.querySelector('#roleName').value;
                const color = popup.querySelector('#roleColor').value;
                const priority = popup.querySelector('#rolePriority').value;
                return { name: name, color: color, priority: Number.parseInt(priority) };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                const newRole = await this.createRoleAPI(result.value);
                await this.fetchRoles()
                this.renderRoles();
                this.selectRole(newRole.id);
            }
        });
    }

    async #assignedUser(role) {
        Swal.fire({
            title: 'Members',
            animation: false,
            customClass: {
                title: "swalTitle",
                popup: "swalPopup",
                cancelButton: "swalCancel",
                confirmButton: "swalConfirm",
                input: "assigned-user-checkbox"

            },
            showCancelButton: true,
            focusConfirm: false,
            confirmButtonText: "Save",
            allowOutsideClick: false,
            preConfirm: () => {
                // Get form values
                let users = Array.from(Swal.getPopup().querySelectorAll('.assigned-user-item'));
                users = users.filter(elt => elt.querySelector("input:checked"))
                users = users.map(item => item.dataset.userId)
                return users;
            },
            html: `
            <style>
                 .assigned-user-item {
                    color: var(--pri-text-color);
                    display: flex;
                    align-items: center;
                }
                
                .assigned-user-item.selected {
                    background-color: var(--pri-bg-color);
                    border-color: var(--pri-button-bg-color);
                }
            
                .assigned-user-checkbox {
                    margin-right: 0.75rem;
                }
            
                .assigned-user-checkbox input[type="checkbox"] {
                    width: 1.25rem;
                    height: 1.25rem;
                    cursor: pointer;
                    accent-color: var(--pri-button-bg-color);
                }
                
                .members-list {
                    overflow-y: auto;
                    max-height: 10rem;
                }
                
                .assigned-user-item.hide {
                    display: none;
                }
            </style>
            <form class='popup'>
                <h2>Current members</h2>
                <input type="text" placeholder="Search..." id="current-members-search">
                <div id="current-members-list" class="members-list">
                    ${this.availableUsers.filter(user => role.members.includes(user.id)).map(user => this.#memberItem(role, user)).join('')}
                </div>
                <h2>Add members :</h2>
                <input type="text" placeholder="Search..." id="add-members-search">
                <div id="add-members-list" class="members-list">
                    ${this.availableUsers.filter(user => !role.members.includes(user.id)).map(user => this.#memberItem(role, user)).join('')}
                </div>
            </form>`,
            didOpen: () => {
                const filterMemberList = (elt, value) => {
                    const items = Array.from(elt.querySelectorAll(".assigned-user-item"))
                    for (const item of items) {
                        item.classList.remove("hide")
                        if (!item.dataset.userLogin.toLowerCase().includes(value.toLowerCase())
                            && !item.dataset.userDisplayName.toLowerCase().includes(value.toLowerCase())) {
                            item.classList.add("hide")
                        }
                    }
                }
                document.querySelector("#current-members-search").addEventListener('input', (e) => {
                    const elt = document.querySelector("#current-members-list")
                    filterMemberList(elt, e.target.value)
                });
                document.getElementById("add-members-search").addEventListener('input', (e) => {
                    const elt = document.querySelector("#add-members-list")
                    filterMemberList(elt, e.target.value)
                });
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                const roleId = role.id
                await this.#toggleUsers(roleId, result.value);
            }
        });
    }

    #memberItem(role, user) {
        return `<div class="assigned-user-item"
                     data-role-id="${role.id}"
                     data-user-id="${user.id}"
                     data-user-login="${user.login}"
                     data-user-display-name="${user.displayName}">
                    <div class="assigned-user-checkbox">
                        <input type="checkbox" ${role.members.includes(user.id) ? 'checked' : ''} readonly>
                    </div>
                    <div>${user.displayName}</div>
                </div>`;
    }

    async #toggleUsers(roleId, users) {
        try {
            await fetchCoreAPI(`/role/${roleId}/user`, 'PUT', users)
            await this.fetchRoles();
            this.renderRoleDetails();
        } catch (error) {
            console.error('Error updating user:', error);
            this.showError('Failed to update user assignment');
        }
    }

    showError(message) {
        const roleDetails = this.shadowRoot.getElementById('roleDetails');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        roleDetails.prepend(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }
}

customElements.define('revoice-server-roles', ServerRolesWebComponent);

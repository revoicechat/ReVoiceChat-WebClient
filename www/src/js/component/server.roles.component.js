class ServerRolesWebComponent extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
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

    async updateRoleUsers(roleId, userId, action) {
        await fetchCoreAPI(`/role/${roleId}/user`, action, [userId])
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                * {
                    font-family: sans-serif;
                    user-select: none;
                    box-sizing: border-box;
                }

                :host {
                    display: block;
                    width: 100%;
                    height: 100vh;
                    background-color: black;
                    color: white;
                }

                button {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                    border-radius: 0.25rem;
                    padding: 0.5rem 1rem;
                    font-weight: 700;
                    text-align: center;
                    border: none;
                }

                .main {
                    display: flex;
                    height: 100vh;
                }

                .room-header {
                    display: flex;
                    padding: 1rem;
                    height: 3.5rem;
                    border-bottom: 1px solid #43434d;
                    align-items: center;
                    justify-content: space-between;
                }

                .room-header h1 {
                    font-size: 1.5rem;
                    margin: 0;
                }

                .btn-primary {
                    background-color: #6366f1;
                    color: #ffffff;
                }

                .btn-primary:hover {
                    background-color: #4042a1;
                }

                .btn-secondary {
                    background-color: #43434d;
                    color: #ffffff;
                }

                .btn-secondary:hover {
                    background-color: #363640;
                }

                .sidebar {
                    display: flex;
                    flex-direction: column;
                    border-right: 1px solid #43434d;
                    width: 20rem;
                    height: 100%;
                    background-color: #1a1a1f;
                }

                .sidebar-header {
                    padding: 1rem;
                    border-bottom: 1px solid #43434d;
                    height: 3.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .sidebar-header h2 {
                    font-size: 1.25rem;
                    margin: 0;
                }

                .sidebar-room-container {
                    flex: 1 1 0%;
                    overflow-y: auto;
                }

                .scrollbar::-webkit-scrollbar {
                    width: 6px;
                }

                .scrollbar::-webkit-scrollbar-track {
                    border-radius: 10px;
                    background: rgba(255, 255, 255, 0.1);
                }

                .scrollbar::-webkit-scrollbar-thumb {
                    border-radius: 10px;
                    background: rgba(37, 211, 102, 0.5);
                }

                .scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(37, 211, 102, 0.7);
                }

                .config-item {
                    display: flex;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                    margin-bottom: 0.3rem;
                    border-radius: 0.25rem;
                    padding: 0.75rem;
                    height: auto;
                    min-height: 3rem;
                    align-items: center;
                    background-color: #2a2a2f;
                }

                .config-item:hover {
                    background-color: #363640;
                }

                .config-item.active {
                    background-color: #4042a1;
                }

                .config-item .icon {
                    border-radius: 9999px;
                    width: 2rem;
                    height: 2rem;
                    flex-shrink: 0;
                }

                .config-item .name {
                    padding-left: 0.75rem;
                    font-weight: 600;
                    font-size: 1rem;
                    flex: 1;
                }

                .role-priority {
                    font-size: 0.75rem;
                    color: #95a5a6;
                    padding-left: 0.75rem;
                }

                .room {
                    display: flex;
                    flex: 1 1 0%;
                    flex-direction: column;
                    height: 100%;
                }

                .room-container {
                    display: flex;
                    flex: 1 1 0%;
                    flex-direction: column;
                    overflow-y: auto;
                }

                .room-content {
                    flex: 1 1 0%;
                    padding: 2rem;
                    overflow-y: auto;
                }

                .config-section {
                    margin-bottom: 2.5rem;
                }

                .config-section h2 {
                    font-size: 1.25rem;
                    margin-bottom: 1.5rem;
                    font-weight: 800;
                    color: white;
                }

                .risk-category {
                    margin-bottom: 2rem;
                }

                .risk-category-header {
                    font-size: 1.125rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    color: #6366f1;
                    padding-bottom: 0.5rem;
                    border-bottom: 2px solid #43434d;
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
                    background-color: #2a2a2f;
                    border-radius: 0.25rem;
                    border-left: 4px solid transparent;
                }

                .risk-item.enabled {
                    border-left-color: rgb(37, 211, 102);
                }

                .risk-item.disabled {
                    border-left-color: rgb(220, 38, 38);
                }

                .risk-item.default {
                    border-left-color: #43434d;
                }

                .risk-name {
                    font-weight: 500;
                    user-select: text;
                }

                .risk-toggle {
                    display: flex;
                    gap: 0.5rem;
                }

                .toggle-btn {
                    padding: 0.4rem 0.75rem;
                    border: 1px solid #43434d;
                    background: #363640;
                    border-radius: 0.25rem;
                    cursor: pointer;
                    font-size: 0.875rem;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    color: white;
                    font-weight: 600;
                }

                .toggle-btn:hover {
                    background: #43434d;
                }

                .toggle-btn.active.enabled {
                    background: rgb(37, 211, 102);
                    border-color: rgb(37, 211, 102);
                    color: black;
                }

                .toggle-btn.active.disabled {
                    background: rgb(220, 38, 38);
                    border-color: rgb(220, 38, 38);
                }

                .toggle-btn.active.default {
                    background: #6366f1;
                    border-color: #6366f1;
                }

                .users-list-container {
                    display: grid;
                    gap: 0.5rem;
                }

                .user-item {
                    display: flex;
                    align-items: center;
                    padding: 0.75rem;
                    background-color: #2a2a2f;
                    border-radius: 0.25rem;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 2px solid transparent;
                }

                .user-item:hover {
                    background-color: #363640;
                }

                .user-item.selected {
                    background-color: #363640;
                    border-color: #6366f1;
                }

                .user-checkbox {
                    margin-right: 0.75rem;
                }

                .user-checkbox input[type="checkbox"] {
                    width: 1.25rem;
                    height: 1.25rem;
                    cursor: pointer;
                    accent-color: #6366f1;
                }

                .user-info {
                    flex: 1;
                }

                .user-name {
                    font-weight: 500;
                }

                .server-structure-modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: 1000;
                    justify-content: center;
                    align-items: center;
                }

                .server-structure-modal.show {
                    display: flex;
                }

                .server-structure-modal-content {
                    background-color: #1a1a1f;
                    border: 1px solid #43434d;
                    padding: 30px;
                    border-radius: 0.25rem;
                    width: 90%;
                    max-width: 500px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                }

                .server-structure-modal h3 {
                    margin-bottom: 20px;
                    color: white;
                    font-weight: 800;
                    font-size: 1.25rem;
                }

                .server-structure-form-group {
                    margin-bottom: 20px;
                }

                .server-structure-form-group label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 700;
                    color: white;
                }

                .server-structure-form-group input,
                .server-structure-form-group select {
                    margin-top: 0.5rem;
                    outline: 2px solid transparent;
                    outline-offset: 2px;
                    border: 1px solid #43434d;
                    border-radius: 0.25rem;
                    padding: 0.5rem 0.75rem;
                    width: 100%;
                    background-color: #2a2a2f;
                    color: #ffffff;
                }

                .server-structure-modal-actions {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                    margin-top: 25px;
                }

                .empty-state {
                    text-align: center;
                    padding: 4rem 2rem;
                    color: #95a5a6;
                }

                .empty-state h3 {
                    margin-bottom: 0.5rem;
                    font-size: 1.25rem;
                }

                .detail-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid #43434d;
                }

                .detail-header .icon {
                    width: 3rem;
                    height: 3rem;
                    border-radius: 9999px;
                }

                .detail-header h2 {
                    font-size: 1.75rem;
                    margin: 0;
                    flex: 1;
                }

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

            <div class="main">
                <div class="sidebar">
                    <div class="sidebar-header">
                        <h2>Roles</h2>
                        <button class="btn-primary" id="createRoleBtn">+ New</button>
                    </div>
                    <div class="sidebar-room-container scrollbar" id="rolesList"></div>
                </div>
                <div class="room">
                    <div class="room-header">
                        <h1>Risk Management</h1>
                    </div>
                    <div class="room-container">
                        <div class="room-content scrollbar" id="roleDetails">
                            <div class="empty-state">
                                <h3>Select a role</h3>
                                <p>Choose a role from the list to view and manage its risks</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="server-structure-modal" id="createRoleModal">
                <div class="server-structure-modal-content">
                    <h3>Create New Role</h3>
                    <div class="server-structure-form-group">
                        <label>Role Name</label>
                        <input type="text" id="roleName" placeholder="Enter role name">
                    </div>
                    <div class="server-structure-form-group">
                        <label>Color</label>
                        <input type="color" id="roleColor" value="#6366f1">
                    </div>
                    <div class="server-structure-form-group">
                        <label>Priority</label>
                        <input type="number" id="rolePriority" placeholder="1" min="1">
                    </div>
                    <div class="server-structure-modal-actions">
                        <button class="btn-secondary" id="cancelCreateBtn">Cancel</button>
                        <button class="btn-primary" id="confirmCreateBtn">Create</button>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const createBtn = this.shadowRoot.getElementById('createRoleBtn');
        const cancelBtn = this.shadowRoot.getElementById('cancelCreateBtn');
        const confirmBtn = this.shadowRoot.getElementById('confirmCreateBtn');

        createBtn.addEventListener('click', () => this.openCreateRoleModal());
        cancelBtn.addEventListener('click', () => this.closeCreateRoleModal());
        confirmBtn.addEventListener('click', () => this.createRole());
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
        rolesList.querySelectorAll('.config-item').forEach(item => {
            item.addEventListener('click', () => {
                const roleId = item.dataset.roleId;
                this.selectRole(roleId);
            });
        });
    }

    selectRole(roleId) {
        this.selectedRoleId = roleId;
        this.renderRoles();
        this.renderRoleDetails();
    }

    renderRoleDetails() {
        const role = this.roles.find(r => r.id === this.selectedRoleId);
        console.log(this.availableUsers)
        console.log(role)
        if (!role) return;
        const roleDetails = this.shadowRoot.getElementById('roleDetails');
        roleDetails.innerHTML = `
            <div class="detail-header">
                <div class="icon" style="background: ${role.color}"></div>
                <h2>${role.name}</h2>
                <div class="detail-priority">Priority: ${role.priority}</div>
            </div>

            <div class="config-section">
                <h2>Risk Configuration</h2>
                ${this.availableRisks.map(category => `
                    <div class="risk-category">
                        <div class="risk-category-header">${category.title}</div>
                        <div class="risk-container">
                            ${category.risks.map(risk => `
                                <div class="risk-item ${role.risks[risk.type] || 'default'}">
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
            </div>

            <div class="config-section">
                <h2>Assigned Users</h2>
                <div class="users-list-container">
                    ${this.availableUsers.map(user => `
                        <div class="user-item ${role.members.includes(user.id) ? 'selected' : ''}"
                             data-role-id="${role.id}" data-user-id="${user.id}">
                            <div class="user-checkbox">
                                <input type="checkbox" ${role.members.includes(user.id) ? 'checked' : ''} readonly>
                            </div>
                            <div class="user-info">
                                <div class="user-name">${user.displayName}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;

        // Add event listeners for risk toggles
        roleDetails.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const roleId = btn.dataset.roleId;
                const risk = btn.dataset.risk;
                const status = btn.dataset.status;
                await this.toggleRisk(roleId, risk, status);
            });
        });

        // Add event listeners for user toggles
        roleDetails.querySelectorAll('.user-item').forEach(item => {
            item.addEventListener('click', async () => {
                const roleId = item.dataset.roleId;
                const userId = item.dataset.userId;
                await this.toggleUser(roleId, userId);
            });
        });
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

    async toggleUser(roleId, userId) {
        try {
            const role = this.roles.find(r => r.id === roleId);
            const action = role.members.includes(userId) ? 'DELETE' : 'PUT';
            await this.updateRoleUsers(roleId, userId, action);
            await this.fetchRoles();
            this.renderRoleDetails();
        } catch (error) {
            console.error('Error updating user:', error);
            this.showError('Failed to update user assignment');
        }
    }

    openCreateRoleModal() {
        const modal = this.shadowRoot.getElementById('createRoleModal');
        modal.classList.add('show');
    }

    closeCreateRoleModal() {
        const modal = this.shadowRoot.getElementById('createRoleModal');
        modal.classList.remove('show');
        this.shadowRoot.getElementById('roleName').value = '';
        this.shadowRoot.getElementById('roleColor').value = '#6366f1';
        this.shadowRoot.getElementById('rolePriority').value = '';
    }

    async createRole() {
        const name = this.shadowRoot.getElementById('roleName').value;
        const color = this.shadowRoot.getElementById('roleColor').value;
        const priority = parseInt(this.shadowRoot.getElementById('rolePriority').value) || this.roles.length + 1;

        if (!name) {
            alert('Please enter a role name');
            return;
        }

        try {
            const roleData = { name: name, color: color, priority: priority };
            const newRole = await this.createRoleAPI(roleData);
            this.roles.push(newRole);
            this.closeCreateRoleModal();
            this.renderRoles();
            this.selectRole(newRole.id);
        } catch (error) {
            console.error('Error creating role:', error);
            this.showError('Failed to create role');
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

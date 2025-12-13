const toggleSidebar = document.getElementById('toggleSidebar');
const toggleUsers = document.getElementById('toggleUsers');
const sidebar = document.querySelector('.sidebar.left');
const sidebarRight = document.getElementById('sidebar-users');
const overlay = document.getElementById('overlay');

function closePanels() {
  sidebar.classList.remove('show');
  sidebarRight.classList.remove('show');
  overlay.classList.remove('show');
}

toggleSidebar.addEventListener('click', () => {
  sidebar.classList.toggle('show');
  sidebarRight.classList.remove('show');
  overlay.classList.toggle('show');
});

toggleUsers.addEventListener('click', () => {
  sidebarRight.classList.toggle('show');
  sidebar.classList.remove('show');
  overlay.classList.toggle('show');
});

overlay.addEventListener('click', closePanels);

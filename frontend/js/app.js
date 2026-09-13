// ============ ΚΑΤΑΣΤΑΣΗ ΕΦΑΡΜΟΓΗΣ ============
let currentUser = null;
let allUsers = [];
let socket = null;

const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');

// ============ AUTH: TABS ============
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
  });
});

// ============ AUTH: LOGIN ============
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';

  try {
    const { user, token } = await Api.login(email, password);
    setToken(token);
    currentUser = user;
    await startApp();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// ============ AUTH: REGISTER ============
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('register-username').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const errorEl = document.getElementById('register-error');
  errorEl.textContent = '';

  try {
    const { user, token } = await Api.register(username, email, password);
    setToken(token);
    currentUser = user;
    await startApp();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// ============ LOGOUT ============
document.getElementById('logout-btn').addEventListener('click', () => {
  clearToken();
  if (socket) socket.disconnect();
  currentUser = null;
  appScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
});

// ============ ΕΚΚΙΝΗΣΗ ΕΦΑΡΜΟΓΗΣ ΜΕΤΑ ΤΟ LOGIN ============
async function startApp() {
  authScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  document.getElementById('current-username').textContent = `👤 ${currentUser.username}`;

  await loadUsers();
  await loadTasks();
  await loadChatHistory();
  connectSocket();
}

// ============ ΧΡΗΣΤΕΣ (για ανάθεση tasks) ============
async function loadUsers() {
  const { users } = await Api.getUsers();
  allUsers = users;

  const assignedFilter = document.getElementById('filter-assigned');
  const taskAssignSelect = document.getElementById('task-assigned-to');

  assignedFilter.innerHTML = '<option value="">Όλοι</option>' +
    users.map((u) => `<option value="${u.id}">${u.username}</option>`).join('');

  taskAssignSelect.innerHTML = '<option value="">— Χωρίς ανάθεση —</option>' +
    users.map((u) => `<option value="${u.id}">${u.username}</option>`).join('');
}

// ============ TASKS ============
const statusLabels = { pending: 'Εκκρεμεί', in_progress: 'Σε εξέλιξη', done: 'Ολοκληρώθηκε' };
const priorityLabels = { low: 'Χαμηλή', normal: 'Κανονική', high: 'Υψηλή' };

async function loadTasks() {
  const status = document.getElementById('filter-status').value;
  const assigned_to = document.getElementById('filter-assigned').value;
  const params = {};
  if (status) params.status = status;
  if (assigned_to) params.assigned_to = assigned_to;

  const { tasks } = await Api.getTasks(params);
  renderTasks(tasks);
}

function renderTasks(tasks) {
  const list = document.getElementById('task-list');
  if (tasks.length === 0) {
    list.innerHTML = '<p style="color:#6b7280;font-size:14px;">Δεν υπάρχουν εργασίες.</p>';
    return;
  }

  list.innerHTML = tasks.map((t) => `
    <div class="task-card" data-id="${t.id}">
      <div class="task-card-top">
        <span class="task-title">${escapeHtml(t.title)}</span>
        <span class="badge badge-${t.status}">${statusLabels[t.status]}</span>
      </div>
      <div class="task-meta">
        ${t.due_date ? `<span>📅 ${t.due_date}</span>` : ''}
        <span class="badge badge-${t.priority}">${priorityLabels[t.priority]}</span>
        ${t.assigned_to_name ? `<span>👤 ${escapeHtml(t.assigned_to_name)}</span>` : '<span>Χωρίς ανάθεση</span>'}
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.task-card').forEach((card) => {
    card.addEventListener('click', () => openTaskModal(card.dataset.id));
  });
}

document.getElementById('filter-status').addEventListener('change', loadTasks);
document.getElementById('filter-assigned').addEventListener('change', loadTasks);

// ============ TASK MODAL ============
const taskModal = document.getElementById('task-modal');

document.getElementById('new-task-btn').addEventListener('click', () => openTaskModal(null));
document.getElementById('task-cancel-btn').addEventListener('click', () => taskModal.classList.add('hidden'));

function openTaskModal(taskId) {
  document.getElementById('task-form').reset();
  document.getElementById('task-id').value = taskId || '';
  document.getElementById('task-delete-btn').classList.toggle('hidden', !taskId);
  document.getElementById('task-modal-title').textContent = taskId ? 'Επεξεργασία εργασίας' : 'Νέα εργασία';

  if (taskId) {
    Api.getTasks().then(({ tasks }) => {
      const t = tasks.find((x) => String(x.id) === String(taskId));
      if (!t) return;
      document.getElementById('task-title').value = t.title;
      document.getElementById('task-description').value = t.description || '';
      document.getElementById('task-due-date').value = t.due_date || '';
      document.getElementById('task-assigned-to').value = t.assigned_to || '';
      document.getElementById('task-priority').value = t.priority;
      document.getElementById('task-status').value = t.status;
    });
  }

  taskModal.classList.remove('hidden');
}

document.getElementById('task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('task-id').value;
  const payload = {
    title: document.getElementById('task-title').value.trim(),
    description: document.getElementById('task-description').value.trim(),
    due_date: document.getElementById('task-due-date').value || null,
    assigned_to: document.getElementById('task-assigned-to').value || null,
    priority: document.getElementById('task-priority').value,
    status: document.getElementById('task-status').value,
  };

  try {
    if (id) {
      await Api.updateTask(id, payload);
    } else {
      await Api.createTask(payload);
    }
    taskModal.classList.add('hidden');
    await loadTasks();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('task-delete-btn').addEventListener('click', async () => {
  const id = document.getElementById('task-id').value;
  if (!id || !confirm('Διαγραφή αυτής της εργασίας;')) return;
  await Api.deleteTask(id);
  taskModal.classList.add('hidden');
  await loadTasks();
});

// ============ CHAT ============
async function loadChatHistory() {
  const { messages } = await Api.getChatHistory();
  const box = document.getElementById('chat-messages');
  box.innerHTML = '';
  messages.forEach(renderChatMessage);
  box.scrollTop = box.scrollHeight;
}

function renderChatMessage(msg) {
  const box = document.getElementById('chat-messages');
  const isOwn = currentUser && msg.user_id === currentUser.id;
  const div = document.createElement('div');
  div.className = `chat-msg${isOwn ? ' own' : ''}`;
  const time = new Date(msg.created_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  div.innerHTML = `<span class="chat-user">${escapeHtml(msg.username)}</span>${escapeHtml(msg.content)}<span class="chat-time">${time}</span>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function connectSocket() {
  socket = io({ auth: { token: getToken() } });

  socket.on('chat:message', (msg) => {
    renderChatMessage(msg);
  });

  socket.on('connect_error', (err) => {
    console.error('Σφάλμα σύνδεσης socket:', err.message);
  });
}

document.getElementById('chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const content = input.value.trim();
  if (!content || !socket) return;
  socket.emit('chat:send', { content });
  input.value = '';
});

// ============ ΒΟΗΘΗΤΙΚΑ ============
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ============ ΑΥΤΟΜΑΤΗ ΣΥΝΔΕΣΗ ΑΝ ΥΠΑΡΧΕΙ TOKEN ============
(async function init() {
  const token = getToken();
  if (!token) return;
  try {
    const { user } = await Api.me();
    currentUser = user;
    await startApp();
  } catch (err) {
    clearToken();
  }
})();

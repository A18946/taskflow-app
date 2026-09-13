// Απλός wrapper γύρω από το fetch API για επικοινωνία με το backend
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function clearToken() {
  localStorage.removeItem('token');
}

async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Σφάλμα αιτήματος (${res.status})`);
  }
  return data;
}

const Api = {
  register: (username, email, password) =>
    apiRequest('/auth/register', { method: 'POST', body: { username, email, password }, auth: false }),

  login: (email, password) =>
    apiRequest('/auth/login', { method: 'POST', body: { email, password }, auth: false }),

  me: () => apiRequest('/auth/me'),

  getUsers: () => apiRequest('/users'),

  getTasks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/tasks${qs ? '?' + qs : ''}`);
  },
  createTask: (task) => apiRequest('/tasks', { method: 'POST', body: task }),
  updateTask: (id, task) => apiRequest(`/tasks/${id}`, { method: 'PUT', body: task }),
  deleteTask: (id) => apiRequest(`/tasks/${id}`, { method: 'DELETE' }),

  getChatHistory: () => apiRequest('/chat/messages'),
};

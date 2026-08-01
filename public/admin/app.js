const loginSection = document.getElementById('login-section');
const loginMessage = document.getElementById('login-message');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const registerForm = document.getElementById('register-form');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const registerRole = document.getElementById('register-role');
const authStatusEl = document.getElementById('auth-status');
const logoutButton = document.getElementById('logout-button');

const dashboardSection = document.getElementById('dashboard-section');
const form = document.getElementById('send-form');
const userSelect = document.getElementById('user-select');
const statusEl = document.getElementById('status');
const notificationsBody = document.getElementById('notifications-body');
const scheduledBody = document.getElementById('scheduled-body');
const scheduleToggle = document.getElementById('schedule-toggle');
const sendAtLabel = document.getElementById('send-at-label');
const sendAtInput = document.getElementById('send-at');
const submitButton = document.getElementById('submit-button');

function setStatus(message) {
  statusEl.textContent = message;
}

function setAuthStatus(message) {
  authStatusEl.textContent = message;
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleString();
}

function showLogin(message) {
  loginSection.hidden = false;
  dashboardSection.hidden = true;
  loginMessage.textContent = message || '';
}

function showDashboard() {
  loginSection.hidden = true;
  dashboardSection.hidden = false;
  loadUsers();
  loadScheduled();
  loadNotifications();
}

async function fetchAuthed(input, init) {
  const res = await fetch(input, init);
  if (res.status === 401) {
    showLogin();
  }
  return res;
}

scheduleToggle.addEventListener('change', () => {
  const scheduling = scheduleToggle.checked;
  sendAtLabel.hidden = !scheduling;
  sendAtInput.hidden = !scheduling;
  sendAtInput.required = scheduling;
  submitButton.textContent = scheduling ? 'Schedule Push' : 'Send Push';
});

async function loadNotifications() {
  const notifications = await fetchAuthed('/api/notifications').then((r) => r.json());
  notificationsBody.innerHTML = '';
  if (notifications.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5">No notifications sent yet</td>';
    notificationsBody.appendChild(row);
    return;
  }
  for (const n of notifications) {
    const row = document.createElement('tr');
    const cells = [n.username, formatDate(n.sentAt), n.title, n.body, n.status];
    for (const value of cells) {
      const td = document.createElement('td');
      td.textContent = value;
      row.appendChild(td);
    }
    notificationsBody.appendChild(row);
  }
}

async function cancelScheduled(id) {
  const res = await fetchAuthed(`/api/scheduled/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    setStatus(`Failed to cancel: ${data.error || res.statusText}`);
    return;
  }
  setStatus('Scheduled notification canceled.');
  loadScheduled();
}

async function loadScheduled() {
  const list = await fetchAuthed('/api/scheduled').then((r) => r.json());
  scheduledBody.innerHTML = '';
  if (list.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="6">Nothing scheduled</td>';
    scheduledBody.appendChild(row);
    return;
  }
  for (const s of list) {
    const row = document.createElement('tr');
    const cells = [s.username, formatDate(s.sendAt), s.title, s.body, s.status];
    for (const value of cells) {
      const td = document.createElement('td');
      td.textContent = value;
      row.appendChild(td);
    }
    const actionTd = document.createElement('td');
    if (s.status === 'pending') {
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancel';
      cancelButton.type = 'button';
      cancelButton.addEventListener('click', () => cancelScheduled(s.id));
      actionTd.appendChild(cancelButton);
    }
    row.appendChild(actionTd);
    scheduledBody.appendChild(row);
  }
}

async function loadUsers() {
  const [identityUsers, recipients] = await Promise.all([
    fetchAuthed('/api/auth/users').then((r) => r.json()),
    fetchAuthed('/api/users').then((r) => r.json()),
  ]);
  userSelect.innerHTML = '';
  if (identityUsers.length === 0) {
    const option = document.createElement('option');
    option.textContent = 'No users registered yet';
    option.disabled = true;
    userSelect.appendChild(option);
    return;
  }
  for (const user of identityUsers) {
    const recipient = recipients.find((r) => r.username === user.id);
    const subscribed = recipient ? recipient.subscribed : false;
    const option = document.createElement('option');
    option.value = user.id;
    option.textContent = `${user.email} (${user.role})${subscribed ? '' : ' (no active subscription)'}`;
    userSelect.appendChild(option);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = userSelect.value;
  const title = document.getElementById('title').value;
  const body = document.getElementById('body').value;
  const icon = document.getElementById('icon').value;
  const scheduling = scheduleToggle.checked;

  if (scheduling) {
    setStatus('Scheduling...');
    try {
      const sendAt = new Date(sendAtInput.value).toISOString();
      const res = await fetchAuthed('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, title, body, icon, sendAt }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status !== 401) setStatus(`Failed: ${data.error}`);
        return;
      }
      setStatus(`Push scheduled for ${username} at ${formatDate(data.sendAt)}.`);
    } catch (err) {
      setStatus(`Something went wrong: ${err.message}`);
    } finally {
      loadScheduled();
    }
    return;
  }

  setStatus('Sending...');
  try {
    const res = await fetchAuthed('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, title, body, icon }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status !== 401) {
        setStatus(`Failed: ${data.error}`);
        loadUsers();
      }
      return;
    }
    setStatus(`Push sent to ${username}.`);
  } catch (err) {
    setStatus(`Something went wrong: ${err.message}`);
  } finally {
    loadNotifications();
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  if (!email || !password) return;

  setAuthStatus('Logging in...');
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    setAuthStatus(`Failed: ${data.error || res.statusText}`);
    return;
  }
  if (data.role !== 'Researcher' && data.role !== 'Trainer') {
    setAuthStatus("This account doesn't have admin access.");
    return;
  }
  setAuthStatus('');
  loginForm.reset();
  showDashboard();
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = registerEmail.value.trim();
  const password = registerPassword.value;
  const role = registerRole.value;
  if (!email || !password) return;

  setAuthStatus('Creating account...');
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    setAuthStatus(`Failed: ${data.error || res.statusText}`);
    return;
  }
  setAuthStatus('');
  registerForm.reset();
  showDashboard();
});

logoutButton.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  showLogin();
});

(async () => {
  const res = await fetch('/api/auth/me');
  if (!res.ok) {
    showLogin();
    return;
  }
  const data = await res.json();
  if (data.role === 'Researcher' || data.role === 'Trainer') {
    showDashboard();
  } else {
    showLogin("This account doesn't have admin access.");
  }
})();

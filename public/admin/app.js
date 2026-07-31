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

function formatDate(isoString) {
  return new Date(isoString).toLocaleString();
}

scheduleToggle.addEventListener('change', () => {
  const scheduling = scheduleToggle.checked;
  sendAtLabel.hidden = !scheduling;
  sendAtInput.hidden = !scheduling;
  sendAtInput.required = scheduling;
  submitButton.textContent = scheduling ? 'Schedule Push' : 'Send Push';
});

async function loadNotifications() {
  const notifications = await fetch('/api/notifications').then((r) => r.json());
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
  const res = await fetch(`/api/scheduled/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    setStatus(`Failed to cancel: ${data.error || res.statusText}`);
    return;
  }
  setStatus('Scheduled notification canceled.');
  loadScheduled();
}

async function loadScheduled() {
  const list = await fetch('/api/scheduled').then((r) => r.json());
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
  const users = await fetch('/api/users').then((r) => r.json());
  userSelect.innerHTML = '';
  if (users.length === 0) {
    const option = document.createElement('option');
    option.textContent = 'No users registered yet';
    option.disabled = true;
    userSelect.appendChild(option);
    return;
  }
  for (const user of users) {
    const option = document.createElement('option');
    option.value = user.username;
    option.textContent = `${user.username}${user.subscribed ? '' : ' (no active subscription)'}`;
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
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, title, body, icon, sendAt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`Failed: ${data.error}`);
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
    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, title, body, icon }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Failed: ${data.error}`);
      loadUsers();
      return;
    }
    setStatus(`Push sent to ${username}.`);
  } catch (err) {
    setStatus(`Something went wrong: ${err.message}`);
  } finally {
    loadNotifications();
  }
});

loadUsers();
loadScheduled();
loadNotifications();

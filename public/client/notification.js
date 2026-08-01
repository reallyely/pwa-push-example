const statusEl = document.getElementById('status');

function setStatus(message) {
  statusEl.textContent = message;
}

function render(notification) {
  document.getElementById('title').textContent = notification.title;
  document.getElementById('body').textContent = notification.body;

  const iconEl = document.getElementById('icon');
  if (notification.icon) {
    iconEl.src = notification.icon;
    iconEl.hidden = false;
  }

  document.getElementById('notification-status').textContent = notification.status;
  document.getElementById('send-at').textContent = notification.sendAt;
  document.getElementById('sent-at').textContent = notification.sentAt || '—';
}

async function load() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    setStatus('No notification id given.');
    return;
  }

  setStatus('Loading...');
  const res = await fetch(`/api/notifications/${id}`);
  if (!res.ok) {
    if (res.status === 401) {
      setStatus('Please log in to view this notification.');
      return;
    }
    const data = await res.json().catch(() => ({}));
    setStatus(`Failed to load notification: ${data.error || res.statusText}`);
    return;
  }

  const notification = await res.json();
  render(notification);
  setStatus('');
}

load().catch((err) => {
  console.error(err);
  setStatus(`Something went wrong: ${err.message}`);
});

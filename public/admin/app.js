const form = document.getElementById('send-form');
const userSelect = document.getElementById('user-select');
const statusEl = document.getElementById('status');

function setStatus(message) {
  statusEl.textContent = message;
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
  }
});

loadUsers();

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

const authSection = document.getElementById('auth-section');
const accountSection = document.getElementById('account-section');
const accountEmail = document.getElementById('account-email');
const authForm = document.getElementById('auth-form');
const authHeading = document.getElementById('auth-heading');
const authSubmit = document.getElementById('auth-submit');
const authToggle = document.getElementById('auth-toggle');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const logoutButton = document.getElementById('logout-button');
const statusEl = document.getElementById('status');

let mode = 'login';

function setStatus(message) {
  statusEl.textContent = message;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIOS() {
  return (
    /iP(hone|od|ad)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function showAccount(email) {
  authSection.hidden = true;
  accountSection.hidden = false;
  accountEmail.textContent = email;
}

function showAuth() {
  authSection.hidden = false;
  accountSection.hidden = true;
}

async function subscribeAndSend() {
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const { publicKey } = await fetch('/api/vapid-public-key').then((r) => r.json());

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
}

async function enableNotifications(email) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    setStatus(`Logged in as ${email}, but this browser doesn't support push notifications.`);
    return;
  }

  // iOS/iPadOS only allows the notification permission prompt (and push in general) once
  // the app is running standalone from the Home Screen — a regular Safari tab silently
  // no-ops on requestPermission(). Send the user to install first instead of prompting.
  if (isIOS() && !isStandalone()) {
    setStatus(
      `Logged in as ${email}. On iPhone/iPad, push only works once this is installed: ` +
        `tap Share → "Add to Home Screen", then open the app from that icon and log in ` +
        `again to finish enabling notifications.`
    );
    return;
  }

  setStatus('Requesting notification permission...');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    setStatus(`Logged in as ${email}, but notification permission was denied.`);
    return;
  }

  setStatus('Subscribing to push...');
  await subscribeAndSend();

  setStatus(`Logged in as ${email}. Notifications enabled — you can install this app now.`);
}

authToggle.addEventListener('click', () => {
  mode = mode === 'login' ? 'register' : 'login';
  authHeading.textContent = mode === 'login' ? 'Log In' : 'Create Account';
  authSubmit.textContent = mode === 'login' ? 'Log In' : 'Create Account';
  authToggle.textContent = mode === 'login' ? 'Need an account? Create one' : 'Already have an account? Log in';
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return;

  try {
    setStatus(mode === 'login' ? 'Logging in...' : 'Registering...');
    const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = mode === 'login' ? { email, password } : { email, password, role: 'Participant' };
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(`Failed: ${data.error || res.statusText}`);
      return;
    }

    showAccount(data.email);
    await enableNotifications(data.email);
  } catch (err) {
    console.error(err);
    setStatus(`Something went wrong: ${err.message}`);
  }
});

logoutButton.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  showAuth();
  setStatus('');
  authForm.reset();
});

// Self-heal on every open: iOS never fires `pushsubscriptionchange`, and web push
// subscriptions on iOS have been observed to go stale outside of any user action, with no
// event to react to. Re-verifying/renewing the subscription each time the installed app
// launches (permission is already granted, so no user gesture is required) is the
// workaround the web push community has converged on in the absence of official guidance.
(async () => {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (!res.ok) {
    showAuth();
    return;
  }

  const data = await res.json();
  showAccount(data.email);

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    await subscribeAndSend();
    setStatus(`Logged in as ${data.email}. Notifications enabled.`);
  } catch (err) {
    console.error('Silent resubscribe failed', err);
  }
})();

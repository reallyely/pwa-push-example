function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

const STORAGE_KEY = 'pwa-push-demo:username';

const form = document.getElementById('register-form');
const usernameInput = document.getElementById('username');
const statusEl = document.getElementById('status');

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

async function subscribeAndSend(username) {
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
    body: JSON.stringify({ username, subscription: subscription.toJSON() }),
  });
}

async function registerAndSubscribe(username) {
  setStatus('Registering...');
  const registerRes = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!registerRes.ok) {
    throw new Error('Registration failed');
  }
  localStorage.setItem(STORAGE_KEY, username);

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    setStatus(`Registered as ${username}, but this browser doesn't support push notifications.`);
    return;
  }

  // iOS/iPadOS only allows the notification permission prompt (and push in general) once
  // the app is running standalone from the Home Screen — a regular Safari tab silently
  // no-ops on requestPermission(). Send the user to install first instead of prompting.
  if (isIOS() && !isStandalone()) {
    setStatus(
      `Registered as ${username}. On iPhone/iPad, push only works once this is installed: ` +
        `tap Share → "Add to Home Screen", then open the app from that icon and submit this ` +
        `form again to finish enabling notifications.`
    );
    return;
  }

  setStatus('Requesting notification permission...');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    setStatus(`Registered as ${username}, but notification permission was denied.`);
    return;
  }

  setStatus('Subscribing to push...');
  await subscribeAndSend(username);

  setStatus(`Registered as ${username}. Notifications enabled — you can install this app now.`);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  if (!username) return;
  try {
    await registerAndSubscribe(username);
  } catch (err) {
    console.error(err);
    setStatus(`Something went wrong: ${err.message}`);
  }
});

// Self-heal on every open: iOS never fires `pushsubscriptionchange`, and web push
// subscriptions on iOS have been observed to go stale outside of any user action, with no
// event to react to. Re-verifying/renewing the subscription each time the installed app
// launches (permission is already granted, so no user gesture is required) is the
// workaround the web push community has converged on in the absence of official guidance.
(async () => {
  const username = localStorage.getItem(STORAGE_KEY);
  if (!username) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (Notification.permission !== 'granted') return;

  usernameInput.value = username;
  try {
    await subscribeAndSend(username);
    setStatus(`Registered as ${username}. Notifications enabled.`);
  } catch (err) {
    console.error('Silent resubscribe failed', err);
  }
})();

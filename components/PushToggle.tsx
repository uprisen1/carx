"use client";

import { useEffect, useState } from "react";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

type State = "hidden" | "off" | "on" | "blocked" | "install" | "busy";

function keyToBytes(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function saveToServer(sub: PushSubscription) {
  return fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
}

export default function PushToggle() {
  const [state, setState] = useState<State>("hidden");

  useEffect(() => {
    if (!PUBLIC_KEY) return; // push not set up on this site yet

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

    if (!supported) {
      // iPhones only allow notifications once the site is added to the home screen
      setState(isIos && !standalone ? "install" : "hidden");
      return;
    }
    if (Notification.permission === "denied") {
      setState("blocked");
      return;
    }

    navigator.serviceWorker
      .getRegistration()
      .then(async (reg) => {
        const sub = await reg?.pushManager.getSubscription();
        if (sub && Notification.permission === "granted") {
          setState("on");
          saveToServer(sub).catch(() => {}); // keeps this device tied to the logged-in account
        } else {
          setState("off");
        }
      })
      .catch(() => setState("off"));
  }, []);

  async function enable() {
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyToBytes(PUBLIC_KEY as string),
        }));
      const res = await saveToServer(sub);
      setState(res.ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
    } finally {
      setState("off");
    }
  }

  if (state === "hidden") return null;

  const common = "text-sm text-gray-600 hover:text-black";

  if (state === "busy") return <span className={common}>…</span>;

  if (state === "on") {
    return (
      <button onClick={disable} className={common} title="Notifications are on. Click to turn off.">
        🔔 On
      </button>
    );
  }

  if (state === "blocked") {
    return (
      <button
        className={common}
        onClick={() =>
          alert(
            "Notifications are blocked for this site. Open your browser's site settings (the icon next to the address), allow Notifications, then reload."
          )
        }
      >
        🚫 Alerts
      </button>
    );
  }

  if (state === "install") {
    return (
      <button
        className={common}
        onClick={() =>
          alert(
            "To get notifications on iPhone: tap the Share button, choose 'Add to Home Screen', then open Gari Yangu from your home screen and tap Alerts again."
          )
        }
      >
        📲 Alerts
      </button>
    );
  }

  return (
    <button onClick={enable} className={common} title="Get notified of new messages">
      🔕 Alerts
    </button>
  );
}

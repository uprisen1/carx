"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export type PushState =
  | "loading"
  | "unavailable" // not logged in, or notifications not set up on the site
  | "install" // iPhone: must be added to the Home Screen first
  | "unsupported" // browser can't do notifications (e.g. in-app browsers)
  | "blocked" // person said "Block" in the browser
  | "off"
  | "on"
  | "busy";

interface PushValue {
  state: PushState;
  canPrompt: boolean; // browser has never been asked, so a popup makes sense
  isAdmin: boolean;
  userId: string | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

const PushContext = createContext<PushValue>({
  state: "unavailable",
  canPrompt: false,
  isAdmin: false,
  userId: null,
  enable: async () => {},
  disable: async () => {},
});

export const usePush = () => useContext(PushContext);

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

// Remembers when someone deliberately switched notifications off
const offKey = (userId: string) => `gy-push-off-${userId}`;

function readFlag(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeFlag(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // private mode: nothing to remember
  }
}

async function subscribeThisDevice(key: string) {
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing) await navigator.serviceWorker.register("/sw.js");
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyToBytes(key),
    }));
  const res = await saveToServer(sub);
  return res.ok;
}

export default function PushProvider({
  userId,
  isAdmin,
  children,
}: {
  userId: string | null;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<PushState>("loading");
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    if (!userId || !PUBLIC_KEY) {
      setState("unavailable");
      return;
    }
    const uid: string = userId;
    const key: string = PUBLIC_KEY;
    let cancelled = false;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

    if (!supported) {
      setState(isIos && !standalone ? "install" : "unsupported");
      return;
    }

    setPermission(Notification.permission);
    if (Notification.permission === "denied") {
      setState("blocked");
      return;
    }

    (async () => {
      try {
        if (Notification.permission === "granted") {
          // Already allowed on this device. Unless they switched it off on purpose,
          // quietly connect this device to the logged-in account.
          if (readFlag(offKey(uid)) === "1") {
            if (!cancelled) setState("off");
            return;
          }
          const ok = await subscribeThisDevice(key);
          if (!cancelled) setState(ok ? "on" : "off");
        } else if (!cancelled) {
          setState("off");
        }
      } catch {
        if (!cancelled) setState("off");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const enable = useCallback(async () => {
    if (!userId || !PUBLIC_KEY) return;
    setState("busy");
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setState(result === "denied" ? "blocked" : "off");
        return;
      }
      const ok = await subscribeThisDevice(PUBLIC_KEY);
      if (ok) writeFlag(offKey(userId), null);
      setState(ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }, [userId]);

  const disable = useCallback(async () => {
    if (!userId) return;
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
      writeFlag(offKey(userId), "1");
    } finally {
      setState("off");
    }
  }, [userId]);

  const canPrompt = state === "off" && permission === "default";

  return (
    <PushContext.Provider value={{ state, canPrompt, isAdmin, userId, enable, disable }}>
      {children}
    </PushContext.Provider>
  );
}

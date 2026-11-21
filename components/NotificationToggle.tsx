"use client";

import { useState } from "react";
import { usePush } from "@/components/PushProvider";

function platform() {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "other";
}

export default function NotificationToggle() {
  const { state, enable, disable, isAdmin, canInstall, install, recheck } = usePush();
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  if (state === "loading" || state === "unavailable") return null;

  const card = "mb-4 rounded-lg border bg-white p-4";

  async function sendTest() {
    setTesting(true);
    setTestMsg(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();
      setTestMsg(
        data.ok
          ? "Sent! A notification should pop up in a few seconds."
          : data.reason ?? "Couldn't send it. Switch notifications off, then on again."
      );
    } catch {
      setTestMsg("Couldn't reach the server. Check your connection.");
    }
    setTesting(false);
  }

  if (state === "blocked") {
    const p = platform();
    const host = window.location.host;
    return (
      <div className={`${card} border-red-200`}>
        <p className="font-medium">🚫 Notifications are blocked on this device</p>
        <p className="mt-1 text-sm text-gray-600">
          Your browser remembers an earlier “Block”, and websites aren't allowed to undo it. You
          only need to fix this once.
        </p>

        {p === "android" && (
          <div className="mt-3 space-y-3 text-sm text-gray-700">
            <div>
              <p className="font-medium">Easiest: no address bar needed</p>
              {canInstall ? (
                <button
                  type="button"
                  onClick={install}
                  className="mt-2 w-full rounded-lg bg-black py-3 text-white"
                >
                  📲 Install the app
                </button>
              ) : (
                <p className="mt-1">
                  Open Chrome's ⋮ menu and tap <b>Add to Home screen</b> (or <b>Install app</b>).
                </p>
              )}
              <p className="mt-2">
                Then press and hold the new <b>Gari Yangu</b> icon on your home screen → tap{" "}
                <b>Site settings</b> → <b>Notifications</b> → <b>Allow</b>.
              </p>
            </div>
            <div>
              <p className="font-medium">Or inside Chrome</p>
              <p className="mt-1">
                ⋮ menu → <b>Settings</b> → <b>Site settings</b> → <b>Notifications</b> → find{" "}
                <b>{host}</b> → <b>Allow</b>.
              </p>
            </div>
          </div>
        )}

        {p === "ios" && (
          <p className="mt-3 text-sm text-gray-700">
            Open the iPhone <b>Settings</b> app → <b>Notifications</b> → <b>Gari Yangu</b> → turn on{" "}
            <b>Allow Notifications</b>.
          </p>
        )}

        {p === "other" && (
          <p className="mt-3 text-sm text-gray-700">
            Click the lock icon next to the web address → <b>Notifications</b> → <b>Allow</b>, then
            reload this page.
          </p>
        )}

        <button
          type="button"
          onClick={recheck}
          className="mt-4 w-full rounded-lg border py-2.5 text-sm font-medium"
        >
          I've done it. Check again
        </button>
      </div>
    );
  }

  if (state === "install") {
    return (
      <div className={card}>
        <p className="font-medium">📲 Add to your Home Screen first</p>
        <p className="mt-1 text-sm text-gray-600">
          On iPhone, tap the Share button, choose <b>Add to Home Screen</b>, then open Gari Yangu
          from your home screen to turn on notifications.
        </p>
      </div>
    );
  }

  if (state === "unsupported") {
    return (
      <div className={card}>
        <p className="font-medium">Open in Chrome to get notifications</p>
        <p className="mt-1 text-sm text-gray-600">
          This browser can't show them. Open the site in Chrome directly, not inside another app.
        </p>
      </div>
    );
  }

  const on = state === "on";
  const busy = state === "busy";

  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">
            {on ? "🔔 Notifications are on" : "🔕 Turn on notifications"}
          </p>
          <p className="mt-0.5 text-sm text-gray-600">
            {on
              ? `You'll get an alert on this device for new messages${
                  isAdmin ? " and listings waiting for approval" : ""
                }.`
              : `Get an alert when a buyer, seller or dealer messages you${
                  isAdmin ? ", or when a listing needs approval" : ""
                }, even when the site is closed.`}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Notifications"
          disabled={busy}
          onClick={on ? disable : enable}
          className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            on ? "bg-green-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${
              on ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {on && (
        <div className="mt-3 border-t pt-3 text-sm">
          <button
            type="button"
            onClick={sendTest}
            disabled={testing}
            className="font-medium text-blue-600 disabled:opacity-60"
          >
            {testing ? "Sending…" : "Send me a test notification"}
          </button>
          {testMsg && <p className="mt-1 text-gray-600">{testMsg}</p>}
        </div>
      )}
    </div>
  );
}

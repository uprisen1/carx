"use client";

import { usePush } from "@/components/PushProvider";

export default function NotificationToggle() {
  const { state, enable, disable, isAdmin } = usePush();

  if (state === "loading" || state === "unavailable") return null;

  const card = "mb-4 rounded-lg border bg-white p-4";

  if (state === "blocked") {
    return (
      <div className={`${card} border-red-200`}>
        <p className="font-medium">🚫 Notifications are blocked</p>
        <p className="mt-1 text-sm text-gray-600">
          Tap the lock icon next to the web address, open <b>Notifications</b>, set it to{" "}
          <b>Allow</b>, then reload this page.
        </p>
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
    <div className={`${card} flex items-center justify-between gap-4`}>
      <div>
        <p className="font-medium">{on ? "🔔 Notifications are on" : "🔕 Turn on notifications"}</p>
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
  );
}

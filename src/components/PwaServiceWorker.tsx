"use client";

import { useEffect } from "react";

type RegisterableLocation = Pick<Location, "protocol" | "hostname">;

export function shouldRegisterServiceWorker(location: RegisterableLocation, hasServiceWorkerSupport: boolean): boolean {
  if (!hasServiceWorkerSupport) return false;

  const isSecureOrigin = location.protocol === "https:";
  const isLocalOrigin = location.hostname === "localhost" || location.hostname === "127.0.0.1";

  return isSecureOrigin || isLocalOrigin;
}

export default function PwaServiceWorker() {
  useEffect(() => {
    if (!shouldRegisterServiceWorker(window.location, "serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return null;
}

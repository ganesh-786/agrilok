"use client";

import { Callout } from "@/components/ui/Callout";
import { useOnline } from "@/lib/client/connectivity";

// Says plainly when the device is offline and what still works. It stays for
// as long as that is true; the brief "back online" confirmation is a toast
// (ShellToasts).
export function ConnectivityBanner({ offline }: { offline: string }) {
  const online = useOnline();
  if (online !== false) return null;
  return (
    <div className="wrap pt-3">
      <Callout tone="offline" role="status" title={offline} />
    </div>
  );
}

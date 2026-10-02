"use client";

import { usePathname, useSearchParams } from "next/navigation";

/** Where to come back to after a settings form (language) is submitted. */
export function ReturnTo() {
  const path = usePathname();
  const search = useSearchParams().toString();
  return <input type="hidden" name="returnTo" value={search ? `${path}?${search}` : path} />;
}

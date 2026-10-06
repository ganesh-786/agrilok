"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Toast, ToastRegion } from "@/components/ui/Toast";
import { useOnline } from "@/lib/client/connectivity";

// The study shell's passing messages, in one place so two of them stack
// instead of landing on top of each other.
//
// - After a change of exam: which exam is now on screen, so a switch from
//   Level 4 to Level 7 (or to another commission) is never silent. When the
//   page the student left existed only in the other exam (a topic, a notice, a
//   question), it also says why a different page opened.
// - After the connection comes back.
//
// Being offline is not here: that is a state, and it stays on the page for as
// long as it is true (ConnectivityBanner).

function SwitchedToast({
  text,
  kept,
  detail,
  close,
}: {
  text: string;
  kept: string;
  detail: string;
  close: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const switched = params.get("switched");
  const key = `${pathname}?${switched}`;
  const [dismissed, setDismissed] = useState<string | null>(null);
  if ((switched !== "1" && switched !== "2") || dismissed === key) return null;

  // The marker in the address has done its job once the message has been
  // shown. Left there, a refresh or a shared link would announce a change of
  // exam that never happened.
  function done() {
    setDismissed(key);
    const next = new URLSearchParams(params.toString());
    next.delete("switched");
    const query = next.toString();
    window.history.replaceState(
      null,
      "",
      `${pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }

  return (
    <Toast
      key={key}
      title={text}
      detail={switched === "2" ? detail : kept}
      closeLabel={close}
      onDone={done}
    />
  );
}

function BackOnlineToast({ text, close }: { text: string; close: string }) {
  const online = useOnline();
  const wasOffline = useRef(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (online === false) {
      wasOffline.current = true;
      const timer = window.setTimeout(() => setShow(false), 0);
      return () => window.clearTimeout(timer);
    }
    if (online && wasOffline.current) {
      wasOffline.current = false;
      const timer = window.setTimeout(() => setShow(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [online]);

  if (!show) return null;
  return <Toast tone="success" title={text} closeLabel={close} onDone={() => setShow(false)} />;
}

export function ShellToasts({
  switched,
  kept,
  switchedDetail,
  backOnline,
  close,
}: {
  switched: string;
  kept: string;
  switchedDetail: string;
  backOnline: string;
  close: string;
}) {
  return (
    <ToastRegion>
      <SwitchedToast text={switched} kept={kept} detail={switchedDetail} close={close} />
      <BackOnlineToast text={backOnline} close={close} />
    </ToastRegion>
  );
}

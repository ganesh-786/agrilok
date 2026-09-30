"use client";

import { useEffect } from "react";

// A client boundary cannot read the language cookie on the server, so this one
// page speaks both languages. It says what happened and offers a retry; it
// never shows a stack trace or an internal message.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error.digest ?? "page error");
  }, [error]);
  return (
    <div className="wrap max-w-xl py-16">
      <h1 className="text-3xl font-extrabold">
        <span lang="ne">केही मिलेन</span>
        <span className="mt-1 block text-xl text-ink-3" lang="en">
          Something went wrong
        </span>
      </h1>
      <p className="mt-4 text-ink-2" lang="ne">
        अहिले सेवासँग जोडिन सकिएन। इन्टरनेट जाँचेर फेरि प्रयास गर्नुहोस्।
      </p>
      <p className="mt-1 text-ink-3" lang="en">
        We could not reach the service. Check your connection and try again.
      </p>
      <p className="mt-6">
        <button type="button" onClick={reset} className="btn btn-primary">
          फेरि प्रयास गर्नुहोस् · Try again
        </button>
      </p>
    </div>
  );
}

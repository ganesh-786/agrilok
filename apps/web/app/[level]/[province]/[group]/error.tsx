"use client";

import { useEffect } from "react";

// A client boundary cannot read the language cookie, so this one message is
// in both languages. It says what happened and offers a retry; it never shows
// a stack trace or an internal message. The study shell around it stays, so
// the student can still move to another screen.
export default function StudyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error.digest ?? "study page error");
  }, [error]);
  return (
    <div className="wrap-narrow py-10">
      <div className="space-y-3">
        <h1 className="text-headline">
          <span lang="ne">केही मिलेन</span>
          <span className="mt-1 block text-title text-ink-3" lang="en">
            Something went wrong
          </span>
        </h1>
        <p className="text-ink-2" lang="ne">
          यो पृष्ठ अहिले खुल्न सकेन। इन्टरनेट जाँचेर फेरि प्रयास गर्नुहोस्; सुरक्षित गरेका विषय अझै
          खुल्छन्।
        </p>
        <p className="text-ink-3" lang="en">
          This page could not open just now. Check your connection and try again; saved topics still
          open.
        </p>
        <button type="button" onClick={reset} className="btn btn-primary">
          फेरि प्रयास गर्नुहोस् · Try again
        </button>
      </div>
    </div>
  );
}

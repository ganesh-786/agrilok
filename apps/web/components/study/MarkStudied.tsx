"use client";

import { useEffect } from "react";

import { markStudied } from "@/lib/client/progress";

/** Records, on this device only, that a topic's study note was opened. */
export function MarkStudied({ syllabusId, topicId }: { syllabusId: string; topicId: string }) {
  useEffect(() => {
    markStudied(syllabusId, topicId);
  }, [syllabusId, topicId]);
  return null;
}

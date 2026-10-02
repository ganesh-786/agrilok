import { notFound, redirect } from "next/navigation";

import { contextPath } from "@/lib/context";
import { levelFromSlug } from "@/lib/levels";
import { getProfile } from "@/lib/preferences";

// /level-4 and /level-7 were the old entry points. They now open the saved
// exam for that level, or setup with the level already chosen.
export default async function LevelRedirect({ params }: { params: Promise<{ level: string }> }) {
  const level = levelFromSlug((await params).level);
  if (!level) notFound();
  const profile = await getProfile();
  if (profile?.level === level) redirect(contextPath(profile));
  redirect(`/start?level=${level}`);
}

import { redirect } from "next/navigation";

import { contextPath } from "@/lib/context";
import { getProfile } from "@/lib/preferences";

// No landing page: a student who has chosen an exam goes straight to it, and
// one who has not goes to the three-tap setup (docs/student-experience.md).
export default async function Root() {
  const profile = await getProfile();
  redirect(profile ? contextPath(profile) : "/start");
}

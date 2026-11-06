"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CLIENT_PROJECT_COOKIE, getClientContext } from "@/lib/data/client-context";

// Il cliente con più cantieri sceglie quale consultare: la scelta resta in un
// cookie su questo dispositivo. Si accetta solo uno dei suoi cantieri.
export async function selectClientProject(formData: FormData) {
  const { projects } = await getClientContext();
  const projectId = String(formData.get("project_id") ?? "");
  if (!projects.some((p) => p.id === projectId)) return;

  const store = await cookies();
  store.set(CLIENT_PROJECT_COOKIE, projectId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  revalidatePath("/", "layout");
}

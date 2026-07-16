"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { cloneCourse } from "@/lib/courses";

// Clone a published course into the visitor's account (guest or real) and
// jump straight into their personal copy.
export async function startCourseAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/courses");

  const courseId = String(formData.get("courseId") ?? "");
  const copy = courseId ? await cloneCourse(courseId, user.id) : null;
  if (!copy) redirect("/courses");

  revalidatePath("/repertoires");
  revalidatePath("/dashboard");
  redirect(`/repertoires/${copy.id}`);
}

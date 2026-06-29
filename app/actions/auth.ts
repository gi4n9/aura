"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const user = await prisma.profile.findUnique({
      where: { id: data.user.id }
    })

    revalidatePath("/", "layout");

    if (user?.role === "ADMIN") {
      return { success: true, redirectTo: "/admin" };
    }

    if (user?.role === "STUDENT") {
      return { success: true, redirectTo: "/" };
    }

    if (user?.role === "INSTRUCTOR") {
      return { success: true, redirectTo: "/instructor" };
    }

  }

}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullname = formData.get("fullname") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullname,
      }
    }
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, redirectTo: "/" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");

  return { success: true, redirectTo: "/" };
}



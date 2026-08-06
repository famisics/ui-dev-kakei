"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type SignInState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function signInWithMagicLink(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = formData.get("email");
  if (typeof email !== "string" || email.length === 0) {
    return { status: "error", message: "メールアドレスを入力してください。" };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "success" };
}

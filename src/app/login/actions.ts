"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SignInState = {
  status: "idle" | "error";
  message?: string;
};

export async function signInWithGitHub(
  _prevState: SignInState,
): Promise<SignInState> {
  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data.url) {
    return {
      status: "error",
      message: error?.message ?? "ログインに失敗しました。",
    };
  }

  redirect(data.url);
}

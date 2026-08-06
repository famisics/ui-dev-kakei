"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type SignInState, signInWithGitHub } from "./actions";

const initialState: SignInState = { status: "idle" };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    signInWithGitHub,
    initialState,
  );

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>ログイン</CardTitle>
          <CardDescription>GitHubアカウントでログインします。</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            {state.status === "error" && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}
            <Button type="submit" disabled={isPending} className="w-full">
              GitHubでログイン
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

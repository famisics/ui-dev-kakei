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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type SignInState, signInWithMagicLink } from "./actions";

const initialState: SignInState = { status: "idle" };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    signInWithMagicLink,
    initialState,
  );

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>ログイン</CardTitle>
          <CardDescription>
            メールアドレスにログイン用のリンクを送信します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.status === "success" ? (
            <p className="text-sm text-muted-foreground">
              メールを確認してください。届いたリンクを開くとログインできます。
            </p>
          ) : (
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              </div>
              {state.status === "error" && (
                <p className="text-sm text-destructive">{state.message}</p>
              )}
              <Button type="submit" disabled={isPending} className="w-full">
                ログインリンクを送信
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

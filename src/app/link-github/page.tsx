"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function LinkGitHubPage() {
  const [error, setError] = useState<string | null>(null);

  async function handleLink() {
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.linkIdentity({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error || !data.url) {
      setError(error?.message ?? "リンクに失敗しました。");
      return;
    }

    window.location.href = data.url;
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>GitHubアカウントをリンク</CardTitle>
          <CardDescription>
            現在ログイン中のアカウントにGitHubログインを紐付けます。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleLink} className="w-full">
            GitHubをリンクする
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="outline" size="sm">
        サインアウト
      </Button>
    </form>
  );
}

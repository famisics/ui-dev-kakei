"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "トップ" },
  { href: "/categories", label: "カテゴリ管理" },
  { href: "/import-sources", label: "カード管理" },
  { href: "/duplicates", label: "重複削除" },
];

export function AppHeader() {
  const pathname = usePathname();

  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) {
    return null;
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="font-semibold">
          家計簿
        </Link>
        <nav aria-label="メインナビゲーション" className="flex flex-wrap gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  buttonVariants({
                    variant: isActive ? "secondary" : "ghost",
                    size: "sm",
                  }),
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

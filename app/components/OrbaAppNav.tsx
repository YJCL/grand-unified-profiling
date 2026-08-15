"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, MessageCircle, Sparkles, UserRound } from "lucide-react";
import { OrbaMark } from "./OrbaMark";

const items = [
  { href: "/mypage", label: "今日", icon: Sparkles },
  { href: "/chat", label: "対話", icon: MessageCircle },
  { href: "/calendar", label: "暦", icon: CalendarDays },
  { href: "/mypage#profile", label: "プロファイル", icon: UserRound },
];

export function OrbaAppNav() {
  const pathname = usePathname();
  return (
    <nav className="orba-app-nav" aria-label="Orba メインナビゲーション">
      <Link href="/mypage" className="orba-app-nav__brand">
        <OrbaMark />
      </Link>
      <div className="orba-app-nav__links">
        {items.map(({ href, label, icon: Icon }) => {
          const target = href.split("#")[0];
          const active = pathname === target && label !== "プロファイル";
          return (
            <Link key={label} href={href} className={active ? "is-active" : ""}>
              <Icon size={15} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

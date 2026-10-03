"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, Moon, Sparkles, Sun, UserRound } from "lucide-react";
import { OrbaMark } from "./OrbaMark";
import { useTheme } from "./ThemeProvider";

const items = [
  { href: "/mypage", label: "今日", icon: Sparkles },
  { href: "/mypage#iching", label: "易", icon: Compass },
  { href: "/calendar", label: "暦", icon: CalendarDays },
  { href: "/mypage#profile", label: "プロファイル", icon: UserRound },
];

export function OrbaAppNav() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  return (
    <>
      <header className="orba-app-header">
        <Link href="/mypage" className="orba-app-nav__brand">
          <OrbaMark />
        </Link>
        <div className="orba-app-header__actions">
          <span>精密に確かめ、温かく言葉にする。</span>
          <button
            type="button"
            onClick={toggle}
            className="orba-theme-toggle"
            aria-label={theme === "dark" ? "ライトモードに切り替える" : "ダークモードに切り替える"}
            aria-pressed={theme === "dark"}
            title={theme === "dark" ? "ライトモードに切り替える" : "ダークモードに切り替える"}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>
      <nav className="orba-app-nav" aria-label="Orba メインナビゲーション">
        <span className="orba-app-nav__label">毎日のOrba</span>
        <div className="orba-app-nav__links">
          {items.map(({ href, label, icon: Icon }) => {
            const target = href.split("#")[0];
            const active = pathname === target && !href.includes("#");
            return (
              <Link key={label} href={href} className={active ? "is-active" : ""}>
                <Icon size={17} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

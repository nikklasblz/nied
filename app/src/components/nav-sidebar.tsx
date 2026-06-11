"use client";

/**
 * Sidebar de navegación de niED.
 *
 * Desktop: fijo a la izquierda 240px.
 * Mobile: visible vía Sheet drawer (controlado desde TopBar).
 *
 * Client component: los labels llegan por props desde el server parent
 * (AppShell / TopBar) vía t().
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  BookOpen,
  Layers,
  Trophy,
  Pen,
  Settings,
  Sparkles,
} from "@/components/icons";
import type { ComponentType, SVGProps } from "react";

export type NavLabels = {
  dashboard: string;
  courses: string;
  review: string;
  achievements: string;
  journal: string;
  settings: string;
  /** aria-label del nav principal. */
  main: string;
  /** aria-label del logo/link a dashboard. */
  logoAria: string;
};

type NavItem = {
  href: string;
  labelKey: keyof Omit<NavLabels, "main" | "logoAria">;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Match si pathname empieza con este prefijo (más allá de igualdad estricta). */
  matchPrefix?: string;
};

const NAV: NavItem[] = [
  { href: "/", labelKey: "dashboard", icon: Home },
  { href: "/courses", labelKey: "courses", icon: BookOpen, matchPrefix: "/courses" },
  { href: "/review", labelKey: "review", icon: Layers, matchPrefix: "/review" },
  { href: "/logros", labelKey: "achievements", icon: Trophy, matchPrefix: "/logros" },
  { href: "/bitacora", labelKey: "journal", icon: Pen, matchPrefix: "/bitacora" },
  { href: "/ajustes", labelKey: "settings", icon: Settings, matchPrefix: "/ajustes" },
];

export function NavSidebarLogo({ ariaLabel }: { ariaLabel: string }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 px-3 py-3 group"
      aria-label={ariaLabel}
    >
      <span className="grid size-8 place-items-center rounded-lg bg-accent-primary/15 ring-1 ring-accent-primary/30">
        <Sparkles
          className="size-4 text-accent-primary"
          strokeWidth={1.8}
          aria-hidden
        />
      </span>
      <span className="font-sans text-lg font-semibold tracking-tight text-fg-primary">
        niED
      </span>
    </Link>
  );
}

export function NavSidebarItems({
  labels,
  reviewDue = 0,
  onNavigate,
}: {
  labels: NavLabels;
  /** Cards SRS vencidas hoy — badge en el item "Repaso" (solo si > 0). */
  reviewDue?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() || "/";
  return (
    <nav className="flex flex-col gap-0.5 px-2" aria-label={labels.main}>
      {NAV.map((item) => {
        const Icon = item.icon;
        const active =
          item.matchPrefix
            ? pathname === item.matchPrefix ||
              pathname.startsWith(`${item.matchPrefix}/`)
            : pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent-primary/12 text-fg-primary"
                : "text-fg-secondary hover:bg-bg-overlay/60 hover:text-fg-primary"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon
              className={cn(
                "size-5",
                active ? "text-accent-primary" : "text-fg-secondary group-hover:text-fg-primary"
              )}
              strokeWidth={1.6}
              aria-hidden
            />
            <span>{labels[item.labelKey]}</span>
            {item.labelKey === "review" && reviewDue > 0 && (
              <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-accent-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-accent-primary ring-1 ring-accent-primary/30">
                {reviewDue}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

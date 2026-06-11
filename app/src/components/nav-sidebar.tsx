"use client";

/**
 * Sidebar de navegación de niED.
 *
 * Desktop: fijo a la izquierda 240px.
 * Mobile: visible vía Sheet drawer (controlado desde TopBar).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  BookOpen,
  Trophy,
  Pen,
  Settings,
  Sparkles,
} from "@/components/icons";
import type { ComponentType, SVGProps } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Match si pathname empieza con este prefijo (más allá de igualdad estricta). */
  matchPrefix?: string;
};

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/courses", label: "Cursos", icon: BookOpen, matchPrefix: "/courses" },
  { href: "/logros", label: "Logros", icon: Trophy, matchPrefix: "/logros" },
  { href: "/bitacora", label: "Bitácora", icon: Pen, matchPrefix: "/bitacora" },
  { href: "/ajustes", label: "Ajustes", icon: Settings, matchPrefix: "/ajustes" },
];

export function NavSidebarLogo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 px-3 py-3 group"
      aria-label="niED — Dashboard"
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
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname() || "/";
  return (
    <nav className="flex flex-col gap-0.5 px-2" aria-label="Navegación principal">
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
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

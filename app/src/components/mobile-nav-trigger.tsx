"use client";

/**
 * Trigger del Sheet drawer en mobile.
 *
 * Visible solo `< md`. Abre un drawer con la misma navegación del sidebar.
 * Client component: labels llegan por props desde TopBar (server).
 */

import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/icons";
import {
  NavSidebarLogo,
  NavSidebarItems,
  type NavLabels,
} from "@/components/nav-sidebar";

export function MobileNavTrigger({
  openLabel,
  navLabels,
}: {
  openLabel: string;
  navLabels: NavLabels;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={openLabel}
            className="md:hidden"
          />
        }
      >
        <Menu className="size-4" strokeWidth={1.8} aria-hidden />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 max-w-full bg-bg-elevated p-0">
        <div className="flex h-full flex-col py-2">
          <NavSidebarLogo ariaLabel={navLabels.logoAria} />
          <div className="mt-2 flex-1 overflow-y-auto">
            <NavSidebarItems labels={navLabels} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

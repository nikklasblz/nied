/**
 * App shell de niED (server component).
 *
 * Layout fijo con sidebar colapsable (desktop) + topbar + main scrollable.
 * Mobile: sidebar oculto, accesible via Sheet desde TopBar.
 *
 * El estado de colapso se maneja con SidebarProvider (client context) y
 * CollapsibleSidebar (client wrapper). Los hijos del sidebar (NavSidebarItems,
 * XPTotalChip) siguen siendo server components pasados como children.
 */

import { NavSidebarItems, NavSidebarLogo } from "@/components/nav-sidebar";
import { XPTotalChip } from "@/components/xp-total-chip";
import { TopBar } from "@/components/top-bar";
import { SidebarProvider } from "@/components/sidebar-provider";
import { CollapsibleSidebar } from "@/components/collapsible-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <CollapsibleSidebar>
          <NavSidebarLogo />
          <div className="mt-2 flex-1 overflow-y-auto pb-2">
            <NavSidebarItems />
          </div>
          <div className="border-t border-border p-3">
            <XPTotalChip />
          </div>
        </CollapsibleSidebar>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

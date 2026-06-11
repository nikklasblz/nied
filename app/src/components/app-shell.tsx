/**
 * App shell de niED (server component).
 *
 * Layout fijo con sidebar colapsable (desktop) + topbar + main scrollable.
 * Mobile: sidebar oculto, accesible via Sheet desde TopBar.
 *
 * El estado de colapso se maneja con SidebarProvider (client context) y
 * CollapsibleSidebar (client wrapper). Los hijos del sidebar (NavSidebarItems,
 * XPTotalChip) siguen siendo server components pasados como children.
 * Los labels de los client components se resuelven aquí con t().
 */

import {
  NavSidebarItems,
  NavSidebarLogo,
  type NavLabels,
} from "@/components/nav-sidebar";
import { XPTotalChip } from "@/components/xp-total-chip";
import { TopBar } from "@/components/top-bar";
import { SidebarProvider } from "@/components/sidebar-provider";
import { CollapsibleSidebar } from "@/components/collapsible-sidebar";
import { t } from "@/lib/i18n";

export function getNavLabels(): NavLabels {
  return {
    dashboard: t("nav.dashboard"),
    courses: t("nav.courses"),
    achievements: t("nav.achievements"),
    journal: t("nav.journal"),
    settings: t("nav.settings"),
    main: t("nav.main"),
    logoAria: t("nav.logoAria"),
  };
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const navLabels = getNavLabels();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <CollapsibleSidebar
          labels={{
            sidebar: t("common.sidebar"),
            hide: t("sidebar.hide"),
            show: t("sidebar.show"),
            hideShort: t("sidebar.hideShort"),
            showShort: t("sidebar.showShort"),
          }}
        >
          <NavSidebarLogo ariaLabel={navLabels.logoAria} />
          <div className="mt-2 flex-1 overflow-y-auto pb-2">
            <NavSidebarItems labels={navLabels} />
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

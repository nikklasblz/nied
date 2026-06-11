"use client";

/**
 * Wrapper client para el aside del sidebar desktop.
 *
 * Lee el estado del SidebarProvider y aplica la transicion de ancho.
 * El contenido interior (server components como XPTotalChip) llega via
 * `children` y no se ve afectado por la directiva "use client".
 */

import type { ReactNode } from "react";
import { useSidebar } from "@/components/sidebar-provider";
import { PanelLeft, PanelLeftClose } from "@/components/icons";

export function CollapsibleSidebar({ children }: { children: ReactNode }) {
  const { open, toggle } = useSidebar();

  return (
    <>
      <aside
        className={`hidden h-screen shrink-0 flex-col border-r border-border bg-bg-elevated md:flex md:sticky md:top-0 overflow-hidden transition-[width,border-color] duration-200 ease-out ${
          open ? "w-60" : "w-0 border-r-transparent"
        }`}
        aria-label="Sidebar"
        aria-hidden={!open}
      >
        <div className="flex h-full w-60 flex-col">{children}</div>
      </aside>

      {/* Boton toggle — fijo abajo-izquierda, solo desktop */}
      <button
        onClick={toggle}
        className="hidden md:flex fixed bottom-4 left-3 z-50 items-center justify-center size-8 rounded-lg bg-bg-elevated border border-border text-fg-secondary hover:text-fg-primary hover:bg-bg-overlay transition-colors duration-150"
        aria-label={open ? "Ocultar menu lateral" : "Mostrar menu lateral"}
        title={open ? "Ocultar menu" : "Mostrar menu"}
      >
        {open ? (
          <PanelLeftClose className="size-4" strokeWidth={1.5} />
        ) : (
          <PanelLeft className="size-4" strokeWidth={1.5} />
        )}
      </button>
    </>
  );
}

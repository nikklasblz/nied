"use client";

/**
 * Provider de estado para el sidebar colapsable.
 *
 * Persiste la preferencia en localStorage. Solo afecta desktop (md+);
 * en mobile el sidebar se maneja via Sheet drawer.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

type SidebarContextValue = {
  open: boolean;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue>({
  open: true,
  toggle: () => {},
});

const STORAGE_KEY = "nied-sidebar";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "closed") setOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      localStorage.setItem(STORAGE_KEY, prev ? "closed" : "open");
      return !prev;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ open, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

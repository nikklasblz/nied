"use client";

/**
 * TOC con scroll-spy para la pagina de unidad.
 *
 * Toma una lista de headings ya descubiertos del DOM (post-mount) y resalta
 * el activo. Como el HTML viene de remark, los h2 no traen ids -- los
 * generamos en el cliente al montar.
 *
 * Colapsable: el usuario puede ocultar la lista para maximizar espacio de
 * lectura. El estado se persiste en localStorage.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "@/components/icons";

const TOC_STORAGE_KEY = "nied-toc";

export function UnitToc({ contentSelector = "#unit-content" }: { contentSelector?: string }) {
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Restaurar estado persistido
  useEffect(() => {
    if (localStorage.getItem(TOC_STORAGE_KEY) === "closed") setTocOpen(false);
  }, []);

  const toggleToc = () => {
    setTocOpen((prev) => {
      localStorage.setItem(TOC_STORAGE_KEY, prev ? "closed" : "open");
      return !prev;
    });
  };

  useEffect(() => {
    const root = document.querySelector(contentSelector);
    if (!root) return;
    const hs = Array.from(root.querySelectorAll<HTMLHeadingElement>("h2, h3"));
    const list: { id: string; text: string; level: number }[] = [];
    hs.forEach((h, i) => {
      if (!h.id) {
        const slug = (h.textContent ?? `seccion-${i}`)
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        h.id = slug || `seccion-${i}`;
      }
      list.push({
        id: h.id,
        text: h.textContent ?? "",
        level: h.tagName === "H2" ? 2 : 3,
      });
    });
    // Reading DOM headings post-mount is by design -- this is a one-shot
    // synchronization with the rendered article, not a feedback loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeadings(list);

    observerRef.current?.disconnect();
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId((visible[0].target as HTMLElement).id);
        }
      },
      { rootMargin: "0px 0px -70% 0px", threshold: [0, 1] }
    );
    hs.forEach((h) => obs.observe(h));
    observerRef.current = obs;
    return () => obs.disconnect();
  }, [contentSelector]);

  if (headings.length === 0) return null;

  return (
    <nav className="text-sm" aria-label="Tabla de contenidos">
      <button
        onClick={toggleToc}
        className="mb-2 flex w-full items-center justify-between text-fg-muted hover:text-fg-secondary transition-colors"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
          En esta unidad
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-150",
            !tocOpen && "-rotate-90"
          )}
          strokeWidth={1.5}
          aria-hidden
        />
      </button>
      {tocOpen && (
        <ul className="flex flex-col gap-0.5 border-l border-border pl-3">
          {headings.map((h) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                className={cn(
                  "block rounded-md px-2 py-1 text-xs leading-snug transition-colors",
                  h.level === 3 && "pl-4 text-fg-muted",
                  activeId === h.id
                    ? "bg-accent-primary/10 text-accent-primary"
                    : "text-fg-secondary hover:text-fg-primary"
                )}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

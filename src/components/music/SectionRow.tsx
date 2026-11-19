"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, type ReactNode } from "react";

export function SectionRow({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * 600, behavior: "smooth" });
  };

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between px-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-text-dim">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          <button
            onClick={() => scroll(-1)}
            className="hidden rounded-full bg-black/60 p-2 text-white shadow transition hover:bg-black/80 sm:block"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scroll(1)}
            className="hidden rounded-full bg-black/60 p-2 text-white shadow transition hover:bg-black/80 sm:block"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth px-6 pb-2">
        {children}
      </div>
    </section>
  );
}

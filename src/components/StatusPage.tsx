import type { Icon } from "@phosphor-icons/react";

/** Full-page message for not-found and error routes. */
export function StatusPage({ icon: Glyph, title, children, actions }: { icon: Icon; title: string; children: React.ReactNode; actions: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-5 py-10 sm:py-16">
      <span className="grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
        <Glyph size={32} aria-hidden />
      </span>
      <h1 className="page-title">{title}</h1>
      <p className="max-w-[52ch] text-lg text-muted">{children}</p>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

import { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end md:gap-6">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary/90">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-[2rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground text-wrap-safe">{description}</p> : null}
      </div>
      {action ? <div className="self-start md:self-auto">{action}</div> : null}
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-[16px] surface p-5", className)}>{children}</div>;
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-display text-[18px] font-bold tracking-tight">{title}</h2>
      {hint ? <span className="font-mono text-[11px] text-ink-soft">{hint}</span> : null}
    </div>
  );
}

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "teal" | "amber" | "rose";
}) {
  const tones = {
    neutral: "bg-paper/60 text-ink-soft ring-1 ring-white/8",
    brand: "bg-brand/15 text-brand",
    teal: "bg-teal/12 text-teal",
    amber: "bg-amber/15 text-amber",
    rose: "bg-rose/12 text-rose",
  } as const;
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", tones[tone])}>{children}</span>
  );
}

export function Field({
  label,
  description,
  hint,
  children,
  className,
}: {
  label: string;
  description?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[12px] text-ink-soft">{label}</span>
      {description ? (
        <span className="mb-1.5 block text-[11px] leading-snug text-ink-soft/70">{description}</span>
      ) : null}
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-ink-soft/80">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-[10px] bg-paper/70 px-3 py-2 text-[14px] text-ink outline-none ring-1 ring-white/10 placeholder:text-ink-soft/60 focus:ring-brand/40";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cn(inputClass, "resize-y", props.className)} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputClass, props.className)} />;
}

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-[13px] font-medium text-brand-ink transition-transform hover:-translate-y-px disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function BrandButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-[13px] font-medium text-brand-ink ring-1 ring-brand-deep/40 transition-transform hover:-translate-y-px hover:bg-brand-deep disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full bg-paper px-3.5 py-2 text-[13px] font-medium text-ink ring-1 ring-white/10 transition-transform hover:-translate-y-px disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-[14px] border border-dashed border-line bg-transparent p-6 text-center">
      <p className="text-[13px] font-medium">{title}</p>
      {hint ? <p className="mt-1 text-[12px] text-ink-soft">{hint}</p> : null}
    </div>
  );
}

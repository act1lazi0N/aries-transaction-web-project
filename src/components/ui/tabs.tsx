"use client";

export function Tabs({ value, onValueChange, items, label }: { value: string; onValueChange: (value: string) => void; items: { value: string; label: string }[]; label: string }) {
  return <div role="tablist" aria-label={label} className="inline-flex rounded-xl bg-surface-muted p-1">{items.map(item => <button key={item.value} type="button" role="tab" aria-selected={item.value === value} className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${item.value === value ? "bg-surface text-foreground shadow-sm" : "text-muted"}`} onClick={() => onValueChange(item.value)}>{item.label}</button>)}</div>;
}

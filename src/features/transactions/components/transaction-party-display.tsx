"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, Copy, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TransactionPartyView, TransactionRead } from "@/features/transactions/types";

export function TransactionPartyDisplay({ party, allowCopy = true }: { party: TransactionPartyView; allowCopy?: boolean }) {
  const number = party.accountNumberDisplay;
  if (party.exposure === "UNAVAILABLE" || !number) return <span className="text-sm text-muted">Account details unavailable</span>;
  const context = party.exposure === "FULL_OWNED" ? "Your account" : "Masked counterparty";
  return <span className="inline-flex min-w-0 items-center gap-2">
    <span className="min-w-0"><span className="block truncate text-sm font-medium">{party.displayName || context}</span><span className="block font-mono text-xs text-muted">{number}</span></span>
    {allowCopy && party.exposure === "FULL_OWNED" && <CopyPartyNumber value={number} />}
  </span>;
}

export function TransactionRouteSummary({ transaction, compact = false }: { transaction: TransactionRead; compact?: boolean }) {
  const config = directionConfig(transaction.direction);
  const Icon = config.icon;
  if (transaction.direction === "OWN_ACCOUNTS") {
    return <div className="min-w-[220px]"><div className="flex items-center gap-2 text-sm font-medium"><Icon aria-hidden="true" size={16} className="text-muted" />{config.label}</div><div className="mt-1 flex flex-wrap items-center gap-1 font-mono text-xs text-muted"><PartyNumber party={transaction.fromParty} /><span aria-hidden="true">→</span><PartyNumber party={transaction.toParty} /></div></div>;
  }
  const party = transaction.direction === "INCOMING" ? transaction.fromParty : transaction.direction === "OUTGOING" ? transaction.toParty : null;
  return <div className={compact ? "min-w-0" : "min-w-[210px]"}><div className="flex items-center gap-2 text-sm font-medium"><Icon aria-hidden="true" size={16} className="text-muted" />{config.label}</div><div className="mt-1">{party ? <TransactionPartyDisplay party={party} allowCopy={false} /> : <span className="text-xs text-muted">Counterparty unavailable</span>}</div></div>;
}

function PartyNumber({ party }: { party: TransactionPartyView }) {
  if (party.exposure !== "FULL_OWNED" || !party.accountNumberDisplay) return <span>Unavailable</span>;
  return <span>{party.accountNumberDisplay}</span>;
}

function directionConfig(direction: TransactionRead["direction"]) {
  switch (direction) {
    case "INCOMING": return { label: "Incoming", icon: ArrowDownLeft };
    case "OUTGOING": return { label: "Outgoing", icon: ArrowUpRight };
    case "OWN_ACCOUNTS": return { label: "Between your accounts", icon: ArrowLeftRight };
    case "UNKNOWN": return { label: "Direction unavailable", icon: HelpCircle };
  }
}

function CopyPartyNumber({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1_500); }
    catch { setCopied(false); }
  }
  return <Button type="button" variant="ghost" className="min-h-7 shrink-0 px-1.5" aria-label={copied ? "Owned account number copied" : "Copy owned account number"} onClick={() => void copy()}>{copied ? <Check aria-hidden="true" size={14} /> : <Copy aria-hidden="true" size={14} />}</Button>;
}

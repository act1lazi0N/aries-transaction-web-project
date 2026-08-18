"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { accountStatusLabel, isActiveAccount, type Account } from "@/features/accounts/types";
import { formatAccountType, formatMoney } from "@/features/accounts/format";

type Props = {
  accounts: Account[];
  value?: string;
  onChange: (accountId: string) => void;
  label?: string;
  id?: string;
  excludeAccountId?: string;
  disabled?: boolean;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: Error | null;
  onRetry?: () => void;
};

export function AccountSelect({ accounts, value, onChange, label = "Account", id = "account-select", excludeAccountId, disabled, isLoading, isFetching, error, onRetry }: Props) {
  const selected = accounts.find(account => account.id === value);
  const options = accounts.filter(account => account.id !== excludeAccountId);
  const descriptionId = `${id}-description`;
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-medium">{label}
      <select id={id} value={value ?? ""} onChange={event => onChange(event.target.value)} disabled={disabled || isLoading} aria-describedby={descriptionId} className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent">
        <option value="">{isLoading ? "Loading accounts…" : options.length === 0 ? "No accounts available" : "Choose an account"}</option>
        {options.map(account => <option key={account.id} value={account.id} disabled={!isActiveAccount(account)}>{account.accountNumber} · {account.currency} · {accountStatusLabel(account.status)}</option>)}
      </select>
    </label>
    {selected && <p id={descriptionId} className="text-xs text-muted">{formatAccountType(selected.accountType)} · {formatMoney(selected.balance, selected.currency)} · {accountStatusLabel(selected.status)}</p>}
    {!selected && <p id={descriptionId} className="text-xs text-muted">Only backend-authorized accounts are available.</p>}
    {error && accounts.length === 0 && <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-[var(--aries-danger)]"><span><AlertTriangle aria-hidden="true" className="mr-1 inline" size={14} />Accounts could not be loaded.</span>{onRetry && <Button type="button" variant="secondary" className="min-h-7 px-2 text-xs" onClick={onRetry}>Retry</Button>}</div>}
    {error && accounts.length > 0 && <p role="alert" className="text-xs text-[var(--aries-warning)]">Account refresh failed; showing the last confirmed list.</p>}
    {isFetching && !isLoading && <p role="status" className="flex items-center gap-1 text-xs text-muted"><RefreshCw aria-hidden="true" size={12} className="animate-spin" />Refreshing accounts</p>}
  </div>;
}

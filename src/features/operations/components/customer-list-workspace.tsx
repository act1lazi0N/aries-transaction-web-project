"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, StatusBanner, WorkspaceSkeleton } from "@/components/ui/workspace-state";
import { useCustomers } from "@/features/operations/queries";
import type { CustomerFilters } from "@/features/operations/types";

export function CustomerListWorkspace({ initialFilters }: { initialFilters: CustomerFilters }) {
  const router = useRouter(); const pathname = usePathname(); const [search, setSearch] = useState(initialFilters.search ?? "");
  const query = useCustomers(initialFilters);
  function update(patch: Partial<CustomerFilters>) {
    const next = { ...initialFilters, ...patch }; const params = new URLSearchParams();
    if (next.search) params.set("search", next.search); if (next.role) params.set("role", next.role); if (next.status) params.set("status", next.status); params.set("page", String(next.page)); params.set("size", String(next.size)); if (next.sort) params.set("sort", next.sort); if (next.direction) params.set("direction", next.direction);
    router.replace(`${pathname}?${params}` as Route, { scroll: false });
  }
  if (query.isPending) return <WorkspaceSkeleton label="Loading customers" />;
  if (query.isError && !query.data) return <ErrorState title="Customers are unavailable" detail="No customer access state is shown until the service confirms it." onRetry={() => void query.refetch()} />;
  const page = query.data;
  return <div className="space-y-6"><header><p className="text-sm font-semibold text-accent">Customer Operations</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Users and merchants</h1><p className="mt-3 max-w-2xl leading-7 text-muted">Search customer identities, review masked account projections, and manage identity access. Suspension never changes funds or account state.</p></header><form className="grid gap-3 rounded-2xl border border-border bg-surface p-4 md:grid-cols-[minmax(260px,1fr)_180px_180px_auto]" onSubmit={event => { event.preventDefault(); update({ search: search.trim() || undefined, page: 0 }); }}><label className="relative"><span className="sr-only">Search name or email</span><Search aria-hidden="true" size={16} className="absolute left-3 top-3 text-muted" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or email" className="pl-9" /></label><Select aria-label="Customer role" value={initialFilters.role ?? ""} onChange={event => update({ role: event.target.value as CustomerFilters["role"] || undefined, page: 0 })}><option value="">All customer roles</option><option value="USER">Users</option><option value="MERCHANT">Merchants</option></Select><Select aria-label="Customer status" value={initialFilters.status ?? ""} onChange={event => update({ status: event.target.value as CustomerFilters["status"] || undefined, page: 0 })}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></Select><div className="flex gap-2"><Button type="submit">Search</Button><Button type="button" variant="ghost" aria-label="Refresh customers" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw aria-hidden="true" size={17} className={query.isFetching ? "animate-spin" : ""} /></Button></div></form>{query.isError && <StatusBanner tone="warning" title="Refresh unavailable">The last confirmed customer list remains visible.</StatusBanner>}{page && page.content.length === 0 ? <EmptyState title="No customers match these filters" detail="Remove a filter or try another search. Staff identities are intentionally excluded." /> : page && <section className="overflow-hidden rounded-2xl border border-border bg-surface" aria-label="Customer results"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{page.content.map(customer => <TableRow key={customer.id}><TableCell><p className="font-semibold">{customer.fullName}</p><p className="mt-1 text-xs text-muted">{customer.email}</p></TableCell><TableCell>{customer.role === "MERCHANT" ? "Merchant" : "User"}</TableCell><TableCell><Badge tone={customer.status === "ACTIVE" ? "success" : "warning"}>{customer.status === "ACTIVE" ? "Active" : "Suspended"}</Badge></TableCell><TableCell><time dateTime={customer.createdAt}>{formatDate(customer.createdAt)}</time></TableCell><TableCell className="text-right"><Link href={`/customers/${customer.id}` as Route} className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-accent hover:bg-surface-muted">View details</Link></TableCell></TableRow>)}</TableBody></Table></div><div className="flex items-center justify-between border-t border-border px-4 py-3"><p className="text-sm text-muted">Page {page.page + 1} of {Math.max(page.totalPages, 1)} · {page.totalElements} customers</p><div className="flex gap-2"><Button variant="secondary" disabled={page.first} onClick={() => update({ page: Math.max(0, page.page - 1) })}>Previous</Button><Button variant="secondary" disabled={page.last} onClick={() => update({ page: page.page + 1 })}>Next</Button></div></div></section>}</div>;
}
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date); }

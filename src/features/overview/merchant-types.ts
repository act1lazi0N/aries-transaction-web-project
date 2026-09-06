export type MerchantTrendPoint = { date: string; inflow: string; outflow: string };
export type MerchantCurrencyOverview = { currency: string; balance: string; inflow: string; outflow: string; refunds: string; pending: string; pendingCount: number; settlementNet: string; trend: MerchantTrendPoint[] };
export type MerchantOverview = { range: "7d" | "30d" | "90d"; timezone: string; generatedAt: string; currencies: MerchantCurrencyOverview[] };

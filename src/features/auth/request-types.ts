export type AuthRequest = <T>(path: string, options?: RequestInit & { financialMutation?: boolean }) => Promise<T>;

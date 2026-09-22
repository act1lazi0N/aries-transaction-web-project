export type AuthRequestOptions = RequestInit & { financialMutation?: boolean; refreshOnUnauthorized?: boolean };
export type AuthRequest = <T>(path: string, options?: AuthRequestOptions) => Promise<T>;

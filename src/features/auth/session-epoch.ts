export type AuthEpochRef = { current: number };

export function advanceAuthEpoch(epoch: AuthEpochRef) {
  epoch.current += 1;
  return epoch.current;
}

export function isCurrentAuthEpoch(epoch: AuthEpochRef, expected: number) {
  return epoch.current === expected;
}

export function canReuseRefreshPromise(inFlightEpoch: number | undefined, currentEpoch: number) {
  return inFlightEpoch === currentEpoch;
}

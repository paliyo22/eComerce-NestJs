import { defer, Observable, retry, timeout, timer } from "rxjs";

export const withRetry = <T>(count: number = 1, delayMs: number = 500, perAttemptTimeout: number = 3000) =>
  (source: Observable<T>) =>
    defer(() => source.pipe(timeout(perAttemptTimeout))).pipe(
      retry({ count, delay: () => timer(delayMs) })
    );

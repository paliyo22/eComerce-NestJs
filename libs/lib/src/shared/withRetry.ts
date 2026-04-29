import { pipe, retry, timeout, TimeoutError, timer } from "rxjs";

export const withRetry = <T>() => pipe(
    timeout<T>(3000),
    retry<T>({
        count: 1,
        delay: (error) => {
            if (error instanceof TimeoutError) return timer(200);
            throw error;
        }
    })
);
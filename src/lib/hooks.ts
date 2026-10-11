"use client";

import { useEffect, useState } from "react";
import { ApiError } from "./api/client";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; error: ApiError | Error }
  | { status: "ready"; data: T };

function sameDeps(a: readonly unknown[], b: readonly unknown[]) {
  return a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
}

/** Manages loading / error / ready states in one place; reloads when dependencies change. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [nonce, setNonce] = useState(0);
  const key = [...deps, nonce];
  const [result, setResult] = useState<{ key: unknown[]; state: AsyncState<T> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fn()
      .then((data) => !cancelled && setResult({ key, state: { status: "ready", data } }))
      .catch((error) => !cancelled && setResult({ key, state: { status: "error", error } }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, key);

  const state: AsyncState<T> = result && sameDeps(result.key, key) ? result.state : { status: "loading" };
  return { state, reload: () => setNonce((n) => n + 1) };
}

"use client";

import {
  checkClientActionLimit,
  formatRetryMessage,
} from "./clientActionLimiter";

export function shouldStopAuthAction({ email, pushToast, onError }) {
  const result = checkClientActionLimit("auth", email || "guest");

  if (result.allowed) return false;

  const message = formatRetryMessage(result.retryAfterMs);
  pushToast?.(message, "error");
  onError?.(message);
  return true;
}

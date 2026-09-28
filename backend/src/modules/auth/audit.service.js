import { childLogger } from "#core/logger/index.js";
import { authRepository } from "./auth.repository.js";

const log = childLogger("audit");

/**
 * Writes an audit entry without blocking or failing the calling request.
 */
export function audit(action, { userId = null, status = "success", context = {}, metadata } = {}) {
  authRepository
    .audit({
      action,
      userId,
      status,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      metadata: metadata ?? undefined,
    })
    .catch((err) => log.error({ err: err.message, action }, "failed to write audit log"));
}

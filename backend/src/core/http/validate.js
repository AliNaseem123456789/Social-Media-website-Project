import { AppError } from "./errors.js";

/**
 * Validates and replaces req.body / req.query / req.params with parsed values.
 * Parsed query and params are stored on req.validated because Express 5 exposes req.query as a getter.
 */
export function validate(schemas) {
  return (req, res, next) => {
    const issues = [];
    req.validated = req.validated || {};

    for (const part of ["params", "query", "body"]) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        issues.push(
          ...result.error.issues.map((i) => ({ field: [part, ...i.path].join("."), message: i.message })),
        );
      } else {
        req.validated[part] = result.data;
        if (part === "body") req.body = result.data;
      }
    }

    if (issues.length) return next(AppError.validation(issues));
    next();
  };
}

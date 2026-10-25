import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import BaseError from '../errors/base.error.js';

export default function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Delegate errors to Express once the response has started.
  if (res.headersSent) return next(error);
  if (error instanceof BaseError) {
    return error.sendAnswer(res);
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      statusCode: 400,
      message: 'Validation Error',
      errors: error.issues,
    });
  }

  if (error instanceof Error && 'type' in error && 'status' in error) {
    // Preserve 400/413/415 only for known parser error types and matching statuses.
    const parserErrors: Record<string, { status: number; message: string }> = {
      'entity.parse.failed': { status: 400, message: 'Invalid JSON body' },
      'entity.too.large': { status: 413, message: 'Request body is too large' },
      'encoding.unsupported': { status: 415, message: 'Unsupported content encoding' },
      'charset.unsupported': { status: 415, message: 'Unsupported character encoding' },
      'request.aborted': { status: 400, message: 'Request was aborted' },
      'request.size.invalid': { status: 400, message: 'Invalid request body size' },
    };
    const known = typeof error.type === 'string' ? parserErrors[error.type] : undefined;
    if (known && error.status === known.status) {
      return new BaseError(known.message, known.status).sendAnswer(res);
    }
  }

  // Exclude request bodies, raw error messages and query strings from unexpected error logs.
  console.error('Unhandled request error', {
    name: error instanceof Error ? error.name : 'UnknownError',
    method: req.method,
    path: req.path,
  });
  return new BaseError().sendAnswer(res);
}

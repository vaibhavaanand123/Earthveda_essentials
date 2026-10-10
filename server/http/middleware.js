import crypto from 'node:crypto';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

export function requestContext(logger) {
  return (req, res, next) => {
    const incoming = req.get('x-request-id');
    req.id = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    const started = process.hrtime.bigint();
    res.on('finish', () => {
      if (!req.path.startsWith('/api')) return;
      logger.info('request', {
        reqId: req.id,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Number((process.hrtime.bigint() - started) / 1_000_000n),
      });
    });
    next();
  };
}

export const noStore = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    req.valid = { ...req.valid, [source]: schema.parse(req[source]) };
    next();
  };
}

export function errorHandler(logger) {
  return (err, req, res, _next) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: {
          code: 'validation_failed',
          message: 'Please check the highlighted fields.',
          fields: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      });
    }
    if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
      return res
        .status(err.status || 400)
        .json({ error: { code: 'bad_body', message: 'Invalid request body.' } });
    }
    if (err instanceof AppError) {
      return res
        .status(err.status)
        .json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    if (String(err?.code || '').includes('SQLITE_CONSTRAINT'))
      return res.status(409).json({
        error: {
          code: 'conflict',
          message: 'That identifier already exists or the data violates a constraint.',
        },
      });
    logger.error('unhandled error', { reqId: req.id, path: req.path, err });
    res.status(500).json({
      error: {
        code: 'internal',
        message: 'Something went wrong. Please try again.',
        requestId: req.id,
      },
    });
  };
}

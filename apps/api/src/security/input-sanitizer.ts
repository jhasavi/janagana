import { NextFunction, Request, Response } from 'express';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window as unknown as Window & typeof globalThis;
const DOMPurify = createDOMPurify(window as any);

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).reduce((acc, [key, item]) => {
      acc[key] = sanitizeValue(item);
      return acc;
    }, {} as Record<string, unknown>);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }

  return value;
}

export function sanitizeRequest(req: Request, _res: Response, next: NextFunction) {
  req.body = sanitizeValue(req.body) as any;
  req.query = sanitizeValue(req.query) as any;
  req.params = sanitizeValue(req.params) as any;
  next();
}

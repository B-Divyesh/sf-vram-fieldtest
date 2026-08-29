'use strict';

const UPSTREAM = 'https://api.sociobot.in/api/v1/products/vram-fieldtest/verify';
const ALLOWANCE = 8;
const WINDOW_SECONDS = 600;

function header(req, name) {
  const headers = req.headers || {};
  return headers[name] || headers[name.toLowerCase()] || '';
}

function clientKey(req) {
  const forwarded = header(req, 'x-azure-clientip') || header(req, 'x-forwarded-for');
  const address = String(forwarded || 'unknown')
    .split(',')[0]
    .trim()
    .slice(0, 128);
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(address)) return address.replace(/:\d+$/, '');
  const bracketedIpv6 = address.match(/^\[([^\]]+)\](?::\d+)?$/);
  return bracketedIpv6 ? bracketedIpv6[1] : address;
}

function response(status, body, headers = {}) {
  return {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      ...headers
    },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

function createLicenseHandler({
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  allowance = ALLOWANCE,
  windowSeconds = WINDOW_SECONDS
} = {}) {
  const buckets = new Map();

  return async function licenseVerify(context, req) {
    const token = String(req.query?.license || '').trim();
    if (!token || token.length > 4096) {
      return response(400, { valid: false, reason: 'invalid_request' });
    }

    const current = now();
    const cutoff = current - windowSeconds * 1000;
    const key = clientKey(req);
    const recent = (buckets.get(key) || []).filter(at => at > cutoff);
    if (recent.length >= allowance) {
      const retryAfter = Math.max(1, Math.ceil((recent[0] + windowSeconds * 1000 - current) / 1000));
      buckets.set(key, recent);
      return response(429, { valid: false, reason: 'rate_limited' }, {
        'Access-Control-Expose-Headers': 'Retry-After',
        'Retry-After': String(retryAfter)
      });
    }
    recent.push(current);
    buckets.set(key, recent);

    try {
      const upstream = await fetchImpl(`${UPSTREAM}?license=${encodeURIComponent(token)}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'vram-fieldtest/0.1.2' }
      });
      const body = await upstream.text();
      const retryAfter = upstream.headers?.get?.('Retry-After');
      const headers = retryAfter
        ? { 'Access-Control-Expose-Headers': 'Retry-After', 'Retry-After': retryAfter }
        : {};
      return response(upstream.status, body, headers);
    } catch (error) {
      context.log?.warn?.('License verification upstream unavailable', error?.message || error);
      return response(503, { valid: false, reason: 'unavailable' }, { 'Retry-After': '60' });
    }
  };
}

const handler = createLicenseHandler();
module.exports = handler;
module.exports.createLicenseHandler = createLicenseHandler;
module.exports.ALLOWANCE = ALLOWANCE;
module.exports.WINDOW_SECONDS = WINDOW_SECONDS;

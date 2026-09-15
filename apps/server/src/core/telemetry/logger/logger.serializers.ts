/**
 * What of a request and a response reaches the log.
 *
 * The default pino-http serializers log every header, the full url and the
 * parsed query — which means every secret a client chooses to send arrives in
 * the log by default. These replace them with an allowlist: a header or a query
 * value that nobody put on the list is not logged, so the failure mode of
 * forgetting something is a missing debug field rather than a leaked secret.
 *
 * The price is that a genuinely useful new header has to be added here before
 * it shows up in the logs. That is the trade we chose — see docs/adr/0003.
 */

type Headers = Record<string, unknown>;

/** Shape pino-std-serializers hands us; also tolerates a raw express request. */
type SerializableRequest = {
  method?: string;
  url?: string;
  headers?: Headers;
  remoteAddress?: string;
  socket?: { remoteAddress?: string };
};

type SerializableResponse = {
  statusCode?: number;
  headers?: Headers;
};

const ALLOWED_REQUEST_HEADERS: ReadonlySet<string> = new Set([
  'host',
  'user-agent',
  'referer',
  'accept',
  'accept-encoding',
  'content-type',
  'content-length',
  'x-request-id',
  'x-forwarded-for',
  'x-forwarded-proto',
]);

const ALLOWED_RESPONSE_HEADERS: ReadonlySet<string> = new Set([
  'content-type',
  'content-length',
  'x-request-id',
  'retry-after',
]);

/** Only used to let the URL parser accept a path-only url. Never logged. */
const PARSER_ORIGIN = 'http://request.local';

const UNPARSEABLE_PATH = '[unparseable]';

const pickAllowed = (
  headers: Headers | undefined,
  allowed: ReadonlySet<string>,
): Headers => {
  const picked: Headers = {};

  for (const [name, value] of Object.entries(headers ?? {})) {
    const lower = name.toLowerCase();

    if (allowed.has(lower)) {
      picked[lower] = value;
    }
  }

  return picked;
};

/**
 * `/orders?token=SECRET` becomes path `/orders` and queryKeys `['token']`.
 *
 * Blanking the whole url would have been one line, and it would have thrown
 * away the single most useful field of the line — which route was called. The
 * names of query parameters are not secret and say which filters were used; the
 * values are the dangerous half, so they never make it into the line. A handler
 * that genuinely needs a value in the log logs that one value by name.
 */
const splitUrl = (
  url: string | undefined,
): { path: string; queryKeys?: string[] } => {
  if (!url) {
    return { path: UNPARSEABLE_PATH };
  }

  try {
    const parsed = new URL(url, PARSER_ORIGIN);
    const keys = [...new Set(parsed.searchParams.keys())];

    return keys.length > 0
      ? { path: parsed.pathname, queryKeys: keys }
      : { path: parsed.pathname };
  } catch {
    return { path: UNPARSEABLE_PATH };
  }
};

export const serializeRequest = (req: SerializableRequest) => ({
  method: req.method,
  ...splitUrl(req.url),
  headers: pickAllowed(req.headers, ALLOWED_REQUEST_HEADERS),
  remoteAddress: req.remoteAddress ?? req.socket?.remoteAddress,
});

export const serializeResponse = (res: SerializableResponse) => ({
  statusCode: res.statusCode,
  headers: pickAllowed(res.headers, ALLOWED_RESPONSE_HEADERS),
});

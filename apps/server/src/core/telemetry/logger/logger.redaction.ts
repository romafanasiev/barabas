/**
 * What never reaches a log line, and how it is blanked.
 *
 * Two mechanisms guard the logs and they guard different things:
 *
 *   - the request serializers (logger.serializers.ts) decide which parts of an
 *     incoming request are logged at all. They are an allowlist, so an unknown
 *     header or query value is dropped by default.
 *   - the redaction paths below blank secrets inside objects the code logs on
 *     purpose — `logger.info({ user })` and friends.
 *
 * Neither of them reads message text: `logger.info('password=' + secret)` and a
 * secret inside `err.message` go through untouched. That is a discipline rule,
 * not a config one — see docs/logging.md.
 */

/**
 * Pino resolves redaction paths literally, one segment at a time: `*.password`
 * blanks `user.password` and nothing deeper. `**` is not recursive — it matches
 * nothing at all and reports no error, which is the worst kind of protection.
 * So every depth is spelled out, and the list necessarily stops somewhere.
 */
const MAX_REDACTION_DEPTH = 4;

/**
 * Values that are blanked outright. Array indices count as a path segment, so
 * `users[0].password` is covered by the same `*.*.password` that covers
 * `user.profile.password`.
 */
const SECRET_KEYS = [
  // credentials
  'password',
  'passwd',
  'newPassword',
  'oldPassword',
  'authorization',
  'cookie',
  'otp',
  'pin',
  // tokens and keys
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'idToken',
  'id_token',
  'sessionId',
  'session_id',
  'apiKey',
  'api_key',
  'apikey',
  'secret',
  'clientSecret',
  'client_secret',
  // payment data
  'card',
  'cardNumber',
  'card_number',
  'pan',
  'cvv',
  'cvc',
  'securityCode',
  'iban',
  'expiry',
  'expiryDate',
] as const;

/** Values that are masked rather than blanked — see maskEmail. */
const EMAIL_KEYS = [
  'email',
  'emailAddress',
  'email_address',
  'userEmail',
  'customerEmail',
] as const;

const REDACTED = '[Redacted]';

const EMAIL_KEY_SET: ReadonlySet<string> = new Set(EMAIL_KEYS);

const atEveryDepth = (key: string): string[] =>
  Array.from({ length: MAX_REDACTION_DEPTH }, (_, level) =>
    [...Array<string>(level).fill('*'), key].join('.'),
  );

export const redactionPaths: string[] = [
  ...SECRET_KEYS.flatMap(atEveryDepth),
  ...EMAIL_KEYS.flatMap(atEveryDepth),
  // Hyphenated keys need bracket syntax, so they cannot be generated above.
  'res.headers["set-cookie"]',
];

/**
 * `v***@example.com` — enough to answer "is this the same person as the line
 * above?" without printing an address that identifies them. Anything that is
 * not shaped like an address is blanked instead of guessed at.
 */
const maskEmail = (value: string): string => {
  const at = value.lastIndexOf('@');

  if (at < 1 || at === value.length - 1) {
    return REDACTED;
  }

  return `${value.slice(0, 1)}***${value.slice(at)}`;
};

/**
 * Pino passes the path of the blanked value. Its leading segments are symbols
 * when the path matched through a wildcard, but the last one is always the key
 * that matched — which is all we need to tell an email from a password.
 */
export const censor = (value: unknown, path: (string | symbol)[]): string => {
  const key = path.at(-1);

  if (
    typeof key === 'string' &&
    EMAIL_KEY_SET.has(key) &&
    typeof value === 'string'
  ) {
    return maskEmail(value);
  }

  return REDACTED;
};

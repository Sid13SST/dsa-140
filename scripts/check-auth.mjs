#!/usr/bin/env node
/**
 * Executes the authentication policy against the attacks it exists to stop.
 *
 *   node scripts/check-auth.mjs
 *
 * Why this exists: every other guarantee in this API is a comment. The claim
 * policy in api/_lib/claims.mjs is the one place where "expired", "replayed",
 * "minted for another origin" and "session no longer active" are decided, and
 * a rule that has never been executed against a hostile input is a rule
 * nobody has actually checked. This runs in `npm run build`, so a change that
 * quietly widens the policy fails the build rather than the deployment.
 *
 * It covers the PURE half — claims, bearer parsing, rate limiting. The half
 * that talks to Clerk (signature verification, ban and lockout state, session
 * status) is not mocked here on purpose: a mock of Clerk would only ever prove
 * that the mock agrees with itself.
 */
import {
  assertRecentAuth,
  assertSessionClaims,
  ClaimError,
  isClerkIssuer,
  parseAuthorizedParties,
  parseBearer,
} from '../api/_lib/claims.mjs'
import { clientIp, hit, _reset } from '../api/_lib/ratelimit.mjs'
import { isAdmin, isSuperAdmin, normaliseEmail, parseEmailList } from '../api/_lib/roles.mjs'

let failures = 0
let checks = 0

function check(name, fn) {
  checks++
  try {
    fn()
  } catch (e) {
    failures++
    console.error(`  FAIL  ${name}\n        ${e.message}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

/** The policy must reject `claims` with exactly this code. */
function rejects(code, claims, options) {
  let thrown = null
  try {
    assertSessionClaims(claims, options)
  } catch (e) {
    thrown = e
  }
  assert(thrown, `expected rejection with code "${code}", but the token was ACCEPTED`)
  assert(thrown instanceof ClaimError, `expected a ClaimError, got ${thrown?.name}`)
  assert(
    thrown.code === code,
    `expected rejection code "${code}", got "${thrown.code}" (${thrown.message})`,
  )
}

const NOW = Date.UTC(2026, 7, 30, 12, 0, 0)
const sec = (ms) => Math.floor(ms / 1000)

/** A token that should pass everything: minted 10s ago, valid for 60s. */
const good = () => ({
  sub: 'user_2abcdef',
  sid: 'sess_2abcdef',
  iss: 'https://sharp-kit-42.clerk.accounts.dev',
  iat: sec(NOW - 10_000),
  nbf: sec(NOW - 10_000),
  exp: sec(NOW + 50_000),
  azp: 'https://dsa140.vercel.app',
  sts: 'active',
})

const policy = {
  now: NOW,
  authorizedParties: ['https://dsa140.vercel.app'],
  issuer: 'https://sharp-kit-42.clerk.accounts.dev',
}

console.log('session claims')

check('accepts a well-formed, fresh token', () => {
  const v = assertSessionClaims(good(), policy)
  assert(v.userId === 'user_2abcdef', 'wrong subject returned')
  assert(v.sessionId === 'sess_2abcdef', 'wrong session returned')
})

check('rejects an expired token', () =>
  // Minted 70s ago with a 60s life: the ordinary expiry case, not a malformed one.
  rejects(
    'expired',
    { ...good(), iat: sec(NOW - 70_000), nbf: sec(NOW - 70_000), exp: sec(NOW - 10_000) },
    policy,
  ))

check('rejects a token that is not valid yet', () =>
  rejects('not_yet_valid', { ...good(), nbf: sec(NOW + 120_000), exp: sec(NOW + 180_000) }, policy))

check('rejects a token issued in the future', () =>
  rejects('issued_in_future', { ...good(), iat: sec(NOW + 120_000) }, policy))

check('rejects a replayed token that is still unexpired', () => {
  /*
   * The attack this exists for: a token captured an hour ago whose `exp` was
   * minted long — signature valid, not expired, and still refused because it
   * is far older than a live client would ever present.
   */
  rejects(
    'stale',
    { ...good(), iat: sec(NOW - 3_600_000), nbf: sec(NOW - 3_600_000), exp: sec(NOW + 3_600_000) },
    policy,
  )
})

check('rejects a token minted for another origin', () =>
  rejects('bad_azp', { ...good(), azp: 'https://not-our-app.example.com' }, policy))

check('rejects a token with no azp when origins are configured', () => {
  const claims = good()
  delete claims.azp
  rejects('bad_azp', claims, policy)
})

check('accepts a token with no azp when no origins are configured', () => {
  const claims = good()
  delete claims.azp
  assertSessionClaims(claims, { now: NOW, issuer: policy.issuer })
})

check('rejects an issuer that is not this instance', () =>
  rejects('wrong_issuer', { ...good(), iss: 'https://other-app.clerk.accounts.dev' }, policy))

/*
 * With CLERK_ISSUER set, any mismatch is `wrong_issuer` — the exact-match
 * branch never gets as far as asking what shape the issuer is. These two cover
 * the other branch: no CLERK_ISSUER configured, so only development issuers
 * are recognised on sight.
 */
const shapeOnly = { now: NOW, authorizedParties: policy.authorizedParties }

check('rejects an issuer that is not Clerk at all', () =>
  rejects('bad_issuer', { ...good(), iss: 'https://evil.example.com' }, shapeOnly))

check('rejects a plain-http issuer', () =>
  rejects('bad_issuer', { ...good(), iss: 'http://sharp-kit-42.clerk.accounts.dev' }, shapeOnly))

check('rejects a custom domain when CLERK_ISSUER is not configured', () =>
  rejects('bad_issuer', { ...good(), iss: 'https://clerk.dsa140.com' }, shapeOnly))

check('rejects a session that is not active', () =>
  rejects('inactive_session', { ...good(), sts: 'pending' }, policy))

check('rejects a token with no session id', () => {
  const claims = good()
  delete claims.sid
  rejects('bad_session', claims, policy)
})

check('rejects a subject that is not a Clerk user id', () =>
  rejects('bad_subject', { ...good(), sub: 'admin' }, policy))

check('rejects string timestamps', () =>
  rejects('bad_time', { ...good(), exp: String(sec(NOW + 50_000)) }, policy))

check('rejects NaN timestamps', () => rejects('bad_time', { ...good(), iat: NaN }, policy))

check('rejects a token valid only after it expires', () =>
  rejects('bad_time', { ...good(), nbf: sec(NOW + 90_000), exp: sec(NOW + 30_000) }, policy))

check('rejects a null payload', () => rejects('malformed', null, policy))

check('tolerates small clock drift, not large', () => {
  const aged = (expOffsetMs) => ({
    ...good(),
    iat: sec(NOW - 70_000),
    nbf: sec(NOW - 70_000),
    exp: sec(NOW + expOffsetMs),
  })
  // 3s past expiry: accepted, because two hosts disagree by a second or two.
  assertSessionClaims(aged(-3_000), { ...policy, clockSkewMs: 5_000 })
  // 30s past: refused. Skew is a tolerance, not a grace period.
  rejects('expired', aged(-30_000), { ...policy, clockSkewMs: 5_000 })
})

console.log('step-up (admin)')

check('accepts a recently proved first factor', () => {
  const r = assertRecentAuth({ ...good(), fva: [2, -1] }, { maxAgeMinutes: 60 })
  assert(r.enforced === true, 'should have enforced when fva is present')
})

check('rejects a first factor proved too long ago', () => {
  let thrown = null
  try {
    assertRecentAuth({ ...good(), fva: [240, -1] }, { maxAgeMinutes: 60 })
  } catch (e) {
    thrown = e
  }
  assert(thrown?.code === 'stale_auth', `expected stale_auth, got ${thrown?.code}`)
})

check('rejects a missing second factor when one is required', () => {
  let thrown = null
  try {
    assertRecentAuth({ ...good(), fva: [2, -1] }, { requireSecondFactor: true })
  } catch (e) {
    thrown = e
  }
  assert(thrown?.code === 'no_second_factor', `expected no_second_factor, got ${thrown?.code}`)
})

check('skips the check when the instance sends no fva', () => {
  const r = assertRecentAuth(good(), { maxAgeMinutes: 60 })
  assert(r.enforced === false, 'should not enforce without the claim')
})

console.log('bearer parsing')

const JWT = 'aaa.bbb.ccc'
check('accepts a normal header', () => assert(parseBearer(`Bearer ${JWT}`) === JWT, 'not parsed'))
check('accepts any case of the scheme', () =>
  assert(parseBearer(`bearer ${JWT}`) === JWT, 'case-sensitive'))
check('rejects a missing header', () => assert(parseBearer(undefined) === null, 'accepted'))
check('rejects an empty credential', () => assert(parseBearer('Bearer ') === null, 'accepted'))
check('rejects a bare token with no scheme', () => assert(parseBearer(JWT) === null, 'accepted'))
check('rejects another scheme', () =>
  assert(parseBearer(`Basic ${JWT}`) === null, 'accepted Basic'))
check('rejects a second credential', () =>
  assert(parseBearer(`Bearer ${JWT} ${JWT}`) === null, 'accepted two'))
check('rejects a non-JWT shape', () => assert(parseBearer('Bearer abcdef') === null, 'accepted'))
check('rejects an absurdly long token', () =>
  assert(parseBearer(`Bearer ${'a'.repeat(9000)}.b.c`) === null, 'accepted'))
check('rejects an array header', () => assert(parseBearer([JWT]) === null, 'accepted array'))

console.log('issuer shapes')
check('accepts a Clerk development issuer', () =>
  assert(isClerkIssuer('https://sharp-kit-42.clerk.accounts.dev'), 'rejected'))
check('does NOT accept a custom domain on shape alone', () =>
  // Production instances are recognised by CLERK_ISSUER, never by pattern.
  assert(!isClerkIssuer('https://clerk.dsa140.com'), 'accepted an unverifiable custom domain'))
check('rejects a lookalike host', () =>
  // Registrable by anyone, and accepted by a naive `startsWith("clerk.")`.
  assert(!isClerkIssuer('https://clerk.accounts.dev.evil.com'), 'accepted lookalike'))
check('accepts a configured production issuer exactly', () => {
  const claims = { ...good(), iss: 'https://clerk.dsa140.com' }
  assertSessionClaims(claims, { ...policy, issuer: 'https://clerk.dsa140.com' })
  rejects('wrong_issuer', claims, { ...policy, issuer: 'https://clerk.other.com' })
})
check('rejects nonsense', () => assert(!isClerkIssuer('not a url'), 'accepted'))

console.log('authorized parties')
check('parses and trims a list', () => {
  const p = parseAuthorizedParties(' https://a.com , https://b.com/ ')
  assert(p.length === 2 && p[0] === 'https://a.com' && p[1] === 'https://b.com', `got ${p}`)
})
check('treats unset as empty', () => assert(parseAuthorizedParties(undefined).length === 0, 'no'))

console.log('roles')

const SUPER = 'siddhant.prasad8@gmail.com'

check('the super admin is the super admin', () =>
  assert(isSuperAdmin(SUPER, SUPER), 'rejected the configured address'))

check('case and whitespace do not matter', () => {
  assert(isSuperAdmin('  Siddhant.Prasad8@Gmail.com  ', SUPER), 'rejected a differently-cased form')
  assert(isSuperAdmin(SUPER, ' SIDDHANT.PRASAD8@GMAIL.COM '), 'rejected a cased configured value')
})

check('a unicode lookalike is not the super admin', () => {
  /*
   * Fullwidth characters render almost identically. NFKC folds them to the
   * plain form, so the comparison cannot be fooled by an address that merely
   * LOOKS like the owner's in a table.
   */
  const fullwidth = 'ｓiddhant.prasad8@gmail.com'
  assert(fullwidth !== SUPER, 'test fixture is not actually a lookalike')
  assert(normaliseEmail(fullwidth) === SUPER, 'NFKC should fold this to the plain form')
})

check('a different address is never the super admin', () => {
  for (const other of [
    'someone.else@gmail.com',
    'siddhant.prasad8@gmail.com.evil.com',
    'siddhant.prasad8+admin@gmail.com',
    'evil@siddhant.prasad8@gmail.com',
    'siddhant.prasad8@gmail.co',
  ]) {
    assert(!isSuperAdmin(other, SUPER), `accepted ${other}`)
  }
})

check('empty never matches empty', () => {
  // The failure that matters: a user with no email and an unset variable must
  // not compare equal and quietly become the super admin.
  assert(!isSuperAdmin('', ''), 'empty matched empty')
  assert(!isSuperAdmin(null, SUPER), 'null matched')
  assert(!isSuperAdmin(SUPER, undefined), 'unset configured value matched')
  assert(!isSuperAdmin(undefined, undefined), 'undefined matched undefined')
})

check('an admin is not automatically the super admin', () => {
  const admins = 'helper@example.com,siddhant.prasad8@gmail.com'
  assert(isAdmin('helper@example.com', admins, SUPER), 'the admin list should admit them')
  assert(!isSuperAdmin('helper@example.com', SUPER), 'but they are NOT the super admin')
})

check('the super admin is always an admin', () =>
  // Even if ADMIN_EMAILS is set to a list that omits them.
  assert(isAdmin(SUPER, 'someone.else@example.com', SUPER), 'super admin lost admin access'))

check('an admin list parses and normalises', () => {
  const list = parseEmailList(' A@b.com , C@D.com ,, ')
  assert(list.length === 2 && list[0] === 'a@b.com' && list[1] === 'c@d.com', `got ${list}`)
})

check('nobody is an admin when nothing is configured', () =>
  assert(!isAdmin('anyone@example.com', undefined, undefined), 'accepted with no config'))

console.log('rate limiting')

check('allows up to the limit, then refuses', () => {
  _reset()
  const opts = { limit: 3, windowMs: 60_000, now: NOW }
  for (let i = 1; i <= 3; i++) {
    assert(hit('k', opts).ok, `request ${i} should have been allowed`)
  }
  const blocked = hit('k', opts)
  assert(!blocked.ok, 'the fourth request should have been refused')
  assert(blocked.retryAfterSeconds > 0, 'a refusal must say when to come back')
})

check('keeps separate keys separate', () => {
  _reset()
  const opts = { limit: 1, windowMs: 60_000, now: NOW }
  assert(hit('a', opts).ok && hit('b', opts).ok, 'one key ate another key’s budget')
  assert(!hit('a', opts).ok, 'the second hit on the same key should refuse')
})

check('rolls over when the window passes', () => {
  _reset()
  assert(hit('k', { limit: 1, windowMs: 1_000, now: NOW }).ok, 'first should pass')
  assert(!hit('k', { limit: 1, windowMs: 1_000, now: NOW }).ok, 'second should refuse')
  assert(hit('k', { limit: 1, windowMs: 1_000, now: NOW + 2_000 }).ok, 'should roll over')
})

check('takes the LAST forwarded hop, not the first', () => {
  /*
   * The client controls what it prepends to x-forwarded-for. Taking hops[0]
   * would let anyone reset their own limit by sending a header, which is the
   * usual way this control is quietly defeated.
   */
  const ip = clientIp({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 203.0.113.9' })
  assert(ip === '203.0.113.9', `took the wrong hop: ${ip}`)
})

check('falls back to x-real-ip, then to unknown', () => {
  assert(clientIp({ 'x-real-ip': '203.0.113.7' }) === '203.0.113.7', 'ignored x-real-ip')
  assert(clientIp({}) === 'unknown', 'should not throw on no headers')
})

if (failures > 0) {
  console.error(`\nauth check FAILED — ${failures} of ${checks} checks did not hold\n`)
  process.exit(1)
}
console.log(`\nauth check ok — ${checks} checks`)

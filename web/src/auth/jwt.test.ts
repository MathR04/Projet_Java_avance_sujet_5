import { describe, expect, it } from 'vitest';
import { makeToken } from '../test-utils';
import { decodePayload } from './jwt';

describe('decodePayload', () => {
  it('reads the payload, accents included', () => {
    expect(decodePayload(makeToken({ name: 'Équipe du forum', role: 'STAFF' }))).toMatchObject({ name: 'Équipe du forum', role: 'STAFF' });
  });

  it('an expired token is no token: the user is logged out', () => {
    const inTwoHours = Date.now() + 2 * 3600 * 1000;
    expect(decodePayload(makeToken(), inTwoHours)).toBeNull();
  });

  it('a token that cannot be read: null', () => {
    expect(decodePayload('not-a-token')).toBeNull();
  });
});

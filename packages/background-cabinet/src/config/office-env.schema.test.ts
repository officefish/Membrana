import { describe, expect, it } from 'vitest';

import { parseOfficeEnv } from './office-env.schema';

describe('parseOfficeEnv — office pair for cabinet registration', () => {
  it('returns null when OFFICE_URL is missing', () => {
    expect(parseOfficeEnv({ OFFICE_API_TOKEN: 'shared-office-token' })).toBeNull();
  });

  it('returns null when OFFICE_API_TOKEN is missing', () => {
    expect(parseOfficeEnv({ OFFICE_URL: 'https://office.test' })).toBeNull();
  });

  it('returns null when either value is blank', () => {
    expect(parseOfficeEnv({ OFFICE_URL: ' ', OFFICE_API_TOKEN: 'shared-office-token' })).toBeNull();
    expect(parseOfficeEnv({ OFFICE_URL: 'https://office.test', OFFICE_API_TOKEN: '' })).toBeNull();
  });

  it('does not validate a half-configured pair; missing any value means office is null', () => {
    expect(parseOfficeEnv({ OFFICE_URL: 'not a url' })).toBeNull();
  });

  it('keeps the explicit office address and token when both are present', () => {
    expect(parseOfficeEnv({ OFFICE_URL: 'https://office.test/', OFFICE_API_TOKEN: 'shared-office-token' })).toEqual({
      url: 'https://office.test/',
      token: 'shared-office-token',
    });
  });
});

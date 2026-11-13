import { readableApiError } from './claude-json';

describe('readableApiError', () => {
  it('turns an SDK API error into a short message', () => {
    const apiError = Object.assign(
      new Error('401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}'),
      {
        status: 401,
        error: { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } },
      },
    );
    const result = readableApiError(apiError) as Error;
    expect(result.message).toBe('Claude API 401: invalid x-api-key');
    expect(result.cause).toBe(apiError);
  });

  it('passes other errors through', () => {
    const plain = new TypeError('Failed to fetch');
    expect(readableApiError(plain)).toBe(plain);
  });
});

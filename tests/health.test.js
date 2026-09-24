const request = require('supertest'); const app = require('../server');
describe('health', () => { test('responds', async () => { const response = await request(app).get('/health'); expect(response.statusCode).toBe(200); expect(response.body.status).toBe('ok'); }); });
describe('request hardening', () => {
  test('rejects malformed refresh requests before controller execution', async () => {
    const response = await request(app).post('/api/auth/refresh').send({});
    expect(response.statusCode).toBe(400);
  });
  test('protects portfolio routes without an access token', async () => {
    const response = await request(app).get('/api/portfolios');
    expect(response.statusCode).toBe(401);
  });
});

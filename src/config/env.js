const required = ['MONGODB_URI'];
function validateEnv() {
  if (process.env.NODE_ENV === 'production') {
    const missing = required.filter(key => !process.env[key]);
    if (!process.env.JWT_SECRET && !process.env.JWT_ACCESS_SECRET) missing.push('JWT_SECRET');
    if (!process.env.REFRESH_TOKEN_SECRET && !process.env.JWT_REFRESH_SECRET) missing.push('REFRESH_TOKEN_SECRET');
    if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}
module.exports = { validateEnv };

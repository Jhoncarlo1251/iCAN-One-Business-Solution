import jwt from 'jsonwebtoken';
export function signAccessToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '2h', issuer: 'ican-api', audience: 'ican-client' });
}

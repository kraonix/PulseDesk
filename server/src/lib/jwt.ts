import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { env } from '../config/env';

export interface JwtPayload {
  sub:   string;  // user id
  email: string;
  role:  string;
}

/** Random unique token ID prevents DB collisions when two tokens are issued in the same second. */
function jti() {
  return randomBytes(16).toString('hex');
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, jti: jti() }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: Pick<JwtPayload, 'sub'>): string {
  return jwt.sign({ ...payload, jti: jti() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): Pick<JwtPayload, 'sub'> {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as Pick<JwtPayload, 'sub'>;
}

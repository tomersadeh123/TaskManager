import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only';

export interface TokenPayload {
  userId: string;
  userName?: string;
  iat?: number;
  exp?: number;
}

export const signToken = (userId: string, userName?: string, expiresIn: string = '24h') => {
  return jwt.sign({ userId, userName }, JWT_SECRET, {
    expiresIn: expiresIn as any
  });
};

export const signRefreshToken = (userId: string, userName?: string) => {
  return jwt.sign({ userId, userName, type: 'refresh' }, JWT_SECRET, {
    expiresIn: '7d' as any
  });
};

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

export const verifyRefreshToken = (token: string): TokenPayload & { type: string } => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload & { type: string };
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    } else {
      throw new Error('Refresh token verification failed');
    }
  }
};
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const ACCESS_TOKEN_EXPIRE = '15m';
const REFRESH_TOKEN_EXPIRE = '30d';

export interface TokenPayload {
  userId: number;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export const generateTokens = (userId: number): Tokens => {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRE });
  const refreshToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
  
  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === 'object' && 'userId' in decoded) {
      return decoded as TokenPayload;
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === 'object' && 'userId' in decoded) {
      return decoded as TokenPayload;
    }
    return null;
  } catch (error) {
    return null;
  }
};


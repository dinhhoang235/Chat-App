import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { AccessToken } from 'livekit-server-sdk';

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_PUBLIC_URL = process.env.LIVEKIT_PUBLIC_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  throw new Error('Missing LiveKit environment variables: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET');
}

function getLiveKitUrlForClient(req: Request) {
  if (LIVEKIT_PUBLIC_URL) {
    return LIVEKIT_PUBLIC_URL;
  }

  if (!LIVEKIT_URL) {
    return LIVEKIT_URL;
  }

  if (LIVEKIT_URL.includes('localhost') || LIVEKIT_URL.includes('127.0.0.1')) {
    const hostHeader = req.get('host')?.split(':')[0];
    if (hostHeader && hostHeader !== 'localhost' && hostHeader !== '127.0.0.1') {
      try {
        const url = new URL(LIVEKIT_URL);
        url.hostname = hostHeader;
        return url.toString();
      } catch {
        // fallback to configured LIVEKIT_URL
      }
    }
  }

  return LIVEKIT_URL;
}

const router = Router();

router.get('/token', authMiddleware, async (req: AuthRequest, res: Response) => {
  const room = String(req.query.room ?? '').trim();
  if (!room) {
    return res.status(400).json({ error: 'Missing room parameter' });
  }

  const identity = `user-${req.userId}`;
  const accessToken = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: identity,
  });

  accessToken.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await accessToken.toJwt();
  return res.json({ token, url: getLiveKitUrlForClient(req), room });
});

export default router;

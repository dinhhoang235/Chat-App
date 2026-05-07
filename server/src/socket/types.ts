import { Socket } from "socket.io";
import { TokenPayload } from "../utils/jwt.js";

export interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
  // OPTIMIZATION #6: Cache user profile on socket connection to avoid DB queries on every typing event
  cachedUserData?: {
    avatar: string | null;
    fullName: string | null;
  };
}

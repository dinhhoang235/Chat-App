import { Socket } from "socket.io";
import { TokenPayload } from "../utils/jwt.js";

export interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
}

import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import UnauthorizedError from "../errors/unauthorized.error.js";

// <P> -> adapts to the parameters coming from the route
export default function auth<P>(
  req: Request<P>,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new UnauthorizedError("No token provided");

    const token = authHeader.split(" ")[1];
    if (!token) throw new UnauthorizedError("Malformed token");

    // return the decoded payload -> payload contains the users infos
    // the payload contain the userId sended on the login service
    const decoded = jwt.verify(token, env.JWT_SECRET) as NewJwtPayload;
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch {
    new UnauthorizedError("Invalid or expired token").sendAnswer(res);
  }
}

// Create a new type because jwt.verify doesn't know that I added id and role on the payload. So, it's throw an error without a new type like this:
interface NewJwtPayload extends JwtPayload {
  id: string;
  role: "ADMIN" | "CLIENT" | "ANALYST";
}

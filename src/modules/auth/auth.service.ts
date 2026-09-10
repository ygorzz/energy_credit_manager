import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { db } from '../../db/prisma.js';
import type { LoginDTO, RegisterDto } from './auth.dto.js';

export default class AuthService {
  public async register(data: RegisterDto) {
    // hash da password
    // db.user.create({ data });
  }

  public async login(data: LoginDTO) {
    const userFound = await db.user.findFirst({
      where: {
        email: data.email,
      },
    });
    if (!userFound) throw new Error('Invalid email or password - 401 UnauthorizedError');

    const passwordIsValid = bcrypt.compare(data.password, userFound.hashPassword);
    if (!passwordIsValid) throw new Error('Invalid email or password - 401 UnauthorizedError');

    const token = jwt.sign(data, env.JWT_SECRET, { expiresIn: '1h' });

    return token;
  }
}

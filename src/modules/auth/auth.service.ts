import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { db } from '../../db/prisma.js';
import type { LoginDTO, RegisterDto } from './auth.dto.js';

export default class AuthService {
  public async register(data: RegisterDto) {
    const alreadyExists = await db.user.findUnique({
      where: {
        email: data.email,
      },
    });
    if (alreadyExists) throw new Error('Already exists a user with this email - ConflictError 409');

    const hashPassword = await bcrypt.hash(data.password, 10);
    const { password, ...rest } = data;
    const newData = { hashPassword: hashPassword, ...rest };
    const newUser = await db.user.create({
      data: newData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true
      }
    });

    return newUser;
  }

  public async login(data: LoginDTO) {
    const userFound = await db.user.findFirst({
      where: {
        email: data.email,
      },
    });
    if (!userFound) throw new Error('Invalid email or password - 401 UnauthorizedError');

    const passwordIsValid = await bcrypt.compare(data.password, userFound.hashPassword);
    if (!passwordIsValid) throw new Error('Invalid email or password - 401 UnauthorizedError');

    // send userId as token payload
    const token = jwt.sign({ id: userFound.id, role: userFound.role }, env.JWT_SECRET, { expiresIn: '1h' });

    return token;
  }
}

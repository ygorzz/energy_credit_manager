import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { db } from '../../db/prisma.js';
import ConflictError from '../../errors/ConflictError.js';
import UnauthorizedError from '../../errors/UnauthorizedError.js';
import type { LoginDTO, RegisterDto } from './auth.dto.js';

export default class AuthService {
  public async register(data: RegisterDto) {
    const alreadyExists = await db.user.findUnique({
      where: {
        email: data.email,
      },
    });
    if (alreadyExists) throw new ConflictError('Already exists a user with this email');

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
        companyId: true,
      },
    });

    return newUser;
  }

  public async login(data: LoginDTO) {
    const userFound = await db.user.findFirst({
      where: {
        email: data.email,
      },
    });
    if (!userFound) throw new UnauthorizedError('Invalid email or password');

    const passwordIsValid = await bcrypt.compare(data.password, userFound.hashPassword);
    if (!passwordIsValid) throw new UnauthorizedError('Invalid email or password');

    // send userId and userRole as token payload
    const token = jwt.sign({ id: userFound.id, role: userFound.role }, env.JWT_SECRET, {
      expiresIn: '1h',
    });

    return token;
  }
}

import type { Prisma, UserRoles } from '../../db/generated/prisma/client.js';
import BadRequestError from '../../errors/bad-request.error.js';
import NotFoundError from '../../errors/not-found.error.js';
import type ClientCompanyRepository from '../Client-Companies/client-company.repository.js';

export default async function validateUserCompany(
  role: UserRoles,
  companyId: string | null,
  repository: ClientCompanyRepository,
  tx: Prisma.TransactionClient,
): Promise<void> {
  // CLIENT users require a company; other roles may remain unlinked.
  if (role === 'CLIENT' && companyId === null) {
    throw new BadRequestError('A client user must be linked to a company');
  }
  // Every supplied company link must reference an existing company.
  if (companyId !== null && !(await repository.findById(companyId, tx))) {
    throw new NotFoundError('Client company not found');
  }
}

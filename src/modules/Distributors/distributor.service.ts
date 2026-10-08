import { Prisma } from "../../db/generated/prisma/client.js";
import ConflictError from "../../errors/conflict.error.js";
import NotFoundError from "../../errors/not-found.error.js";
import type DistributorRepository from "./distributor.repository.js";
import type {
  CreateDistributorDTO,
  UpdateDistributorDTO,
} from "./distributor.dto.js";

export default class DistributorService {
  constructor(private distributorRepository: DistributorRepository) {}
  public createDistributor = async (data: CreateDistributorDTO) => {
    try {
      return await this.distributorRepository.create(data);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new ConflictError(
            "Already exists a distributor with this name",
          );
        }
      }
      throw error;
    }
  };

  public listDistributors = async (page: number, limit: number) => {
    const skip = (page - 1) * limit;
    return await this.distributorRepository.findAll(
      skip, 
      limit
    )
  };

  public getDistributorById = async (id: string) => {
    const distributorFound = await this.distributorRepository.findById(id);

    if (!distributorFound) throw new NotFoundError("Distributor not found");

    return distributorFound;
  };

  public deleteDistributor = async (id: string) => {
    try {
      return await this.distributorRepository.delete(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError("Distributor not found");
        }
      }
      throw error;
    }
  };

  public updateDistributor = async (id: string, data: UpdateDistributorDTO) => {
    try {
      const newData = data.name === undefined ? {} : { name: data.name };
      return await this.distributorRepository.update(id, newData);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError("Distributor not found");
        }
      }
      throw error;
    }
  };
}

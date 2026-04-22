import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  ListRoleRequestBodyDTO,
  ParamsRoleRequestDTO,
} from './dto/role.request';
import { CommonStatus } from '../enum/common.status';
import { CreateBodyRoleRequestDTO } from './dto/create.role.request';
import { RoleEntity } from '../database/role.entity';

@Injectable()
export class RoleService {
  constructor(
    private readonly roleRepository: Repository<RoleEntity>,
    private dataSource: DataSource,
  ) {}

  async getRoleById(param: ParamsRoleRequestDTO): Promise<any> {
    try {
      const role = await this.roleRepository
        .createQueryBuilder('r')
        .where('r.uuid = :id', { id: param.id })
        .getRawOne();

      if (!role) {
        throw new NotFoundException({
          message: 'Role not found',
        });
      }

      return role;
    } catch (error) {
      throw new Error(error);
    }
  }

  async getAllRoles(body: ListRoleRequestBodyDTO): Promise<any> {
    try {
      const roles = await this.roleRepository
        .createQueryBuilder('r')
        .andWhereInIds(body.ids)
        .getRawMany();

      if (!roles.length) {
        throw new NotFoundException({
          message: 'Roles not found',
        });
      }

      return roles;
    } catch (error) {
      throw new Error(error);
    }
  }

  async create(body: CreateBodyRoleRequestDTO): Promise<any> {
    try {
      const role = await this.roleRepository
        .createQueryBuilder('r')
        .where('r.name = :name', { name: body.name })
        .getOne();

      if (role) {
        throw new BadRequestException({
          message: 'Role with this name already exists',
        });
      }

      const newRole = await this.roleRepository
        .createQueryBuilder('r')
        .insert()
        .into(RoleEntity)
        .values({
          name: body.name,
          description: body.description,
          additionalInfo: body.additionalInfo,
          priority: body.priority,
        })
        .execute();

      return newRole;
    } catch (error) {
      throw new Error(error);
    }
  }

  async update(
    param: ParamsRoleRequestDTO,
    body: CreateBodyRoleRequestDTO,
  ): Promise<any> {
    const queryRunner = await this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const role = await this.roleRepository
        .createQueryBuilder('r', queryRunner)
        .where('r.uuid = :id', { id: param.id })
        .getOne();

      if (!role) {
        throw new NotFoundException({
          message: 'Role not found',
        });
      }
      await queryRunner.startTransaction();

      const updatedRole = await this.roleRepository
        .createQueryBuilder('r', queryRunner)
        .update(RoleEntity)
        .set({
          name: body.name,
          description: body.description,
          additionalInfo: body.additionalInfo,
          priority: body.priority,
        })
        .where('uuid = :id', { id: param.id })
        .returning('*')
        .execute();

      await queryRunner.commitTransaction();
      return updatedRole;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(error);
    } finally {
      await queryRunner.release();
    }
  }

  async delete(param: ParamsRoleRequestDTO): Promise<any> {
    const queryRunner = await this.dataSource.createQueryRunner();

    await queryRunner.connect();
    try {
      const role = await this.roleRepository
        .createQueryBuilder('r', queryRunner)
        .where('r.uuid = :id', { id: param.id })
        .getRawOne();

      if (!role) {
        throw new NotFoundException({
          message: 'Role not found',
        });
      }
      await queryRunner.startTransaction();
      const deletedRole = await this.roleRepository
        .createQueryBuilder('r', queryRunner)
        .update(RoleEntity)
        .set({
          status: CommonStatus.DELETED,
        })
        .where('r.uuid = :id', { id: param.id })
        .returning('*')
        .execute();

      await queryRunner.commitTransaction();
      return deletedRole;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(error);
    } finally {
      await queryRunner.release();
    }
  }
}

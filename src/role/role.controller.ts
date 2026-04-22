import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RoleService } from './role.service';
import {
  ListRoleRequestBodyDTO,
  ParamsRoleRequestDTO,
} from './dto/role.request';
import { AuthGuard } from '../guard/auth.guard';
import { RoleGuard } from '../guard/role.guard';
import { CreateBodyRoleRequestDTO } from './dto/create.role.request';
import { UpdateBodyRoleRequestDTO } from './dto/update.role.request';

@Controller('role')
@UseGuards(AuthGuard, RoleGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('/:id')
  async getRoleById(@Param() param: ParamsRoleRequestDTO): Promise<any> {
    try {
      return await this.roleService.getRoleById(param);
    } catch (error) {
      throw new Error(error);
    }
  }

  @Get('/list')
  async getAllRoles(@Body() body: ListRoleRequestBodyDTO): Promise<any> {
    try {
      return await this.roleService.getAllRoles(body);
    } catch (error) {
      throw new Error(error);
    }
  }

  @Post('/create')
  async createRole(@Body() body: CreateBodyRoleRequestDTO): Promise<any> {
    try {
      return await this.roleService.create(body);
    } catch (error) {
      throw new Error(error);
    }
  }

  @Patch('/update/:id')
  async updateRole(
    @Param() param: ParamsRoleRequestDTO,
    @Body() body: UpdateBodyRoleRequestDTO,
  ): Promise<any> {
    try {
      return await this.roleService.update(param, body);
    } catch (error) {
      throw new Error(error);
    }
  }

  @Delete('/delete/:id')
  async deleteRole(@Param() param: ParamsRoleRequestDTO): Promise<any> {
    try {
      return await this.roleService.delete(param);
    } catch (error) {
      throw new Error(error);
    }
  }
}

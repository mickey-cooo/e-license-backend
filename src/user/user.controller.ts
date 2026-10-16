import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public, Roles } from '../decorator/roles.decorator';
import { Token } from '../decorator/token.decorator';
import { RoleType } from '../enum/role.status';
import type { Actor } from '../utils/auth/actor';
import { CreateUserBodyDTO } from './dto/create-user.dto';
import {
  ParamUserDTO,
  ParamUserListRequestBodyDTO,
} from './dto/param-user.dto';
import { QueryUserDTO } from './dto/query-user.dto';
import {
  ForgotPasswordDTO,
  RegisterRequestDTO,
} from './dto/register-request.dto';
import { ResetPasswordRequestDTO } from './dto/reset-password.request.dto';
import { SignInRequestDTO } from './dto/sign-in-request.dto';
import { UpdateUserBodyDTO } from './dto/update-user.dto';
import { UserService } from './user.service';

const strictLimit = { default: { limit: 5, ttl: 60_000 } };

@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(RoleType.ADMIN)
  @Post('/create')
  async createUser(@Body() body: CreateUserBodyDTO, @Token() actor: Actor) {
    return this.userService.createUser(body, actor);
  }

  @Roles(RoleType.ADMIN)
  @Post('/list')
  async findAllUsers(
    @Body() body: ParamUserListRequestBodyDTO,
    @Query() query: QueryUserDTO,
  ) {
    return this.userService.findAllUsers(body, query.offset, query.limit);
  }

  @Get('/:id')
  async findUserByUuid(@Param() param: ParamUserDTO, @Token() actor: Actor) {
    return this.userService.findUserByUuid(param, actor);
  }

  @Patch('/update/:id')
  async updateUser(
    @Param() param: ParamUserDTO,
    @Body() body: UpdateUserBodyDTO,
    @Token() actor: Actor,
  ) {
    return this.userService.updateUser(param, body, actor);
  }

  @Delete('/delete/:id')
  async deleteUser(@Param() param: ParamUserDTO, @Token() actor: Actor) {
    return this.userService.deleteUser(param, actor);
  }

  @Public()
  @Throttle(strictLimit)
  @Post('/sign-in')
  async signIn(@Body() body: SignInRequestDTO) {
    return this.userService.signIn(body);
  }

  @Public()
  @Throttle(strictLimit)
  @Post('/register')
  async register(@Body() body: RegisterRequestDTO) {
    return this.userService.register(body);
  }

  @Public()
  @Throttle(strictLimit)
  @Post('/forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDTO) {
    return this.userService.forgotPassword(body);
  }

  @Public()
  @Throttle(strictLimit)
  @Post('/reset-password')
  async resetPassword(@Body() body: ResetPasswordRequestDTO) {
    return this.userService.resetPassword(body);
  }
}

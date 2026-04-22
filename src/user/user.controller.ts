import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  ParamUserDTO,
  ParamUserListRequestBodyDTO,
} from './dto/param-user.dto';
import { QueryUserDTO } from './dto/query-user.dto';
import { UpdateUserBodyDTO } from './dto/update-user.dto';
import { SignInRequestDTO } from './dto/sign-in-request.dto';
import {
  RegisterByEmailDTO,
  RegisterRequestDTO,
} from './dto/register-request.dto';
import { ResetPasswordRequestDTO } from './dto/reset-password.request.dto';
import { CreateUserBodyDTO } from './dto/create-user.dto';
import { Token } from '../decorator/token.decorator';
import { AuthGuard } from '../guard/auth.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard)
  @Post('/create')
  async createUser(@Body() body: CreateUserBodyDTO, @Token() token: string) {
    return this.userService.createUser(body, token);
  }

  @UseGuards(AuthGuard)
  @Get('/list')
  async findAllUsers(
    @Body() body: ParamUserListRequestBodyDTO,
    @Query() query: QueryUserDTO,
  ) {
    return this.userService.findAllUsers(body, query.offset, query.limit);
  }

  @UseGuards(AuthGuard)
  @Get('/:id')
  async findUserByUuid(@Param() param: ParamUserDTO) {
    return this.userService.findUserByUuid(param);
  }

  @UseGuards(AuthGuard)
  @Patch('/update/:id')
  async updateUser(
    @Param() param: ParamUserDTO,
    @Body() body: UpdateUserBodyDTO,
  ) {
    return this.userService.updateUser(param, body);
  }

  @UseGuards(AuthGuard)
  @Delete('/delete/:id')
  async deleteUser(@Param() param: ParamUserDTO) {
    return this.userService.deleteUser(param);
  }

  @Post('/sign-in')
  async signIn(@Body() body: SignInRequestDTO) {
    return this.userService.signIn(body);
  }

  @Post('/register')
  async register(@Body() body: RegisterRequestDTO) {
    return this.userService.register(body);
  }

  @Post('/register-by-email')
  async registerByEmail(@Body() body: RegisterByEmailDTO) {
    return this.userService.registerByEmail(body);
  }

  @Post('/reset-password')
  async resetPassword(
    @Body() body: ResetPasswordRequestDTO,
    @Query('token') token: string,
  ) {
    return this.userService.resetPassword(body, token);
  }
}

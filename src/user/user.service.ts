import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AddressEntity } from '../database/address.entity';
import { MerchantEntity } from '../database/merchant.entity';
import { ResetPasswordEntity } from '../database/reset-password.entity';
import { UserEntity } from '../database/user.entity';
import { CommonStatus } from '../enum/common.status';
import { ResetPasswordStatus } from '../enum/reset.password.status';
import { MailerEmailService } from '../mailer/mailer.service';
import {
  type Actor,
  assertCanManageUser,
  assertSelfOrAdmin,
} from '../utils/auth/actor';
import { CreateUserBodyDTO } from './dto/create-user.dto';
import {
  ParamUserDTO,
  ParamUserListRequestBodyDTO,
} from './dto/param-user.dto';
import {
  ForgotPasswordDTO,
  RegisterRequestDTO,
} from './dto/register-request.dto';
import { ResetPasswordRequestDTO } from './dto/reset-password.request.dto';
import { SignInRequestDTO } from './dto/sign-in-request.dto';
import { UpdateUserBodyDTO } from './dto/update-user.dto';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const PG_UNIQUE_VIOLATION = '23505';
// compared against when the email is unknown, so timing does not reveal it
const DUMMY_HASH =
  '$2b$10$UeyjX9rCY43pAkXVmXIrxuuaAR/j0iHHUV52dCnReEiLzanTNK2NW';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const publicUserColumns = [
  'u.uuid AS "uuid"',
  'u.name AS "name"',
  'u.lastName AS "lastName"',
  'u.phoneNumber AS "phoneNumber"',
  'u.email AS "email"',
  'u.status AS "status"',
  'a.province AS "province"',
  'a.district AS "district"',
  'a.subDistrict AS "subDistrict"',
  'a.postalCode AS "postalCode"',
  'a.detail AS "detail"',
];

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ResetPasswordEntity)
    private readonly resetPasswordRepository: Repository<ResetPasswordEntity>,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerEmailService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async createUser(body: CreateUserBodyDTO, actor: Actor) {
    const userUuid = await this.dataSource.transaction(async (manager) => {
      const user = await manager
        .createQueryBuilder()
        .insert()
        .into(UserEntity)
        .values({
          name: body.name,
          lastName: body.lastName,
          phoneNumber: body.phoneNumber,
          status: CommonStatus.ACTIVE,
          createdBy: actor.id,
        })
        .execute();
      const uuid = user.generatedMaps[0].uuid as string;
      await this.insertAddress(manager, uuid, body.addressDetail, actor.id);
      return uuid;
    });

    return {
      success: true,
      message: 'User created successfully',
      data: { uuid: userUuid },
    };
  }

  async findAllUsers(
    body: ParamUserListRequestBodyDTO,
    offset: number,
    limit: number,
  ) {
    const users = await this.userRepository
      .createQueryBuilder('u')
      .leftJoin('u.addressDetail', 'a')
      .select(publicUserColumns)
      .where('u.status = :status', { status: CommonStatus.ACTIVE })
      .andWhere('u.uuid IN (:...ids)', { ids: body.ids })
      .orderBy('u.createdAt', 'DESC')
      .offset(offset)
      .limit(limit)
      .getRawMany();

    return {
      success: true,
      message: 'Users fetched successfully',
      data: users,
    };
  }

  async findUserByUuid(param: ParamUserDTO, actor: Actor) {
    assertSelfOrAdmin(actor, param.id);

    const user = await this.userRepository
      .createQueryBuilder('u')
      .leftJoin('u.addressDetail', 'a')
      .select(publicUserColumns)
      .where('u.uuid = :id', { id: param.id })
      .andWhere('u.status = :status', { status: CommonStatus.ACTIVE })
      .getRawOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'User fetched successfully',
      data: user,
    };
  }

  async updateUser(param: ParamUserDTO, body: UpdateUserBodyDTO, actor: Actor) {
    assertSelfOrAdmin(actor, param.id);

    await this.dataSource.transaction(async (manager) => {
      const currentUser = await manager
        .createQueryBuilder(UserEntity, 'u')
        .leftJoinAndSelect('u.addressDetail', 'a')
        .where('u.uuid = :id', { id: param.id })
        .andWhere('u.status = :status', { status: CommonStatus.ACTIVE })
        .getOne();

      if (!currentUser) {
        throw new NotFoundException('User not found');
      }
      assertCanManageUser(actor, currentUser);

      await manager.update(UserEntity, currentUser.uuid, {
        name: body.name,
        lastName: body.lastName,
        phoneNumber: body.phoneNumber,
        updatedBy: actor.id,
      });

      if (!body.addressDetail) {
        return;
      }
      if (currentUser.addressDetail?.uuid) {
        await manager.update(AddressEntity, currentUser.addressDetail.uuid, {
          ...body.addressDetail,
          updatedBy: actor.id,
        });
      } else {
        await this.insertAddress(
          manager,
          currentUser.uuid,
          body.addressDetail,
          actor.id,
        );
      }
    });

    return {
      success: true,
      message: 'User updated successfully',
      data: { uuid: param.id },
    };
  }

  async deleteUser(param: ParamUserDTO, actor: Actor) {
    assertSelfOrAdmin(actor, param.id);

    await this.dataSource.transaction(async (manager) => {
      const currentUser = await manager
        .createQueryBuilder(UserEntity, 'u')
        .leftJoinAndSelect('u.addressDetail', 'a')
        .leftJoinAndSelect('u.merchant', 'm')
        .where('u.uuid = :id', { id: param.id })
        .andWhere('u.status != :status', { status: CommonStatus.DELETED })
        .getOne();

      if (!currentUser) {
        throw new NotFoundException('User not found');
      }
      assertCanManageUser(actor, currentUser);

      await manager.update(UserEntity, currentUser.uuid, {
        status: CommonStatus.DELETED,
        updatedBy: actor.id,
      });
      if (currentUser.merchant?.uuid) {
        await manager.update(MerchantEntity, currentUser.merchant.uuid, {
          status: CommonStatus.DELETED,
          updatedBy: actor.id,
        });
      }
      if (currentUser.addressDetail?.uuid) {
        await manager.softDelete(AddressEntity, currentUser.addressDetail.uuid);
      }
    });

    return {
      success: true,
      message: 'User deleted successfully',
      data: null,
    };
  }

  async signIn(body: SignInRequestDTO) {
    const user = await this.userRepository
      .createQueryBuilder('u')
      .where('u.email = :email', { email: body.email })
      .andWhere('u.status = :status', { status: CommonStatus.ACTIVE })
      .getOne();

    const isPasswordValid = await bcrypt.compare(
      body.password,
      user?.password ?? DUMMY_HASH,
    );
    if (!user || !isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      accessToken: this.jwtService.sign({ id: user.uuid, role: user.role }),
      user: { uuid: user.uuid },
    };
  }

  async register(body: RegisterRequestDTO) {
    if (body.password !== body.confirmPassword) {
      throw new BadRequestException(
        'Password and Confirm Password do not match',
      );
    }
    const hashedPassword = await bcrypt.hash(body.password, 10);

    try {
      const newUser = await this.userRepository
        .createQueryBuilder()
        .insert()
        .into(UserEntity)
        .values({
          email: body.email,
          password: hashedPassword,
          status: CommonStatus.ACTIVE,
        })
        .execute();

      return {
        message: 'User registered successfully',
        user: { uuid: newUser.generatedMaps[0].uuid, email: body.email },
      };
    } catch (error) {
      // the unique index is the real guard; a pre-check would race
      if (error?.code === PG_UNIQUE_VIOLATION) {
        throw new BadRequestException('Email already exists');
      }
      throw error;
    }
  }

  async forgotPassword(body: ForgotPasswordDTO) {
    const generic = {
      message: 'If the email is registered, a reset link has been sent.',
    };
    const user = await this.userRepository.findOneBy({
      email: body.email,
      status: CommonStatus.ACTIVE,
    });
    if (!user) {
      return generic;
    }

    const token = randomBytes(32).toString('hex');
    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(ResetPasswordEntity)
        .set({ status: ResetPasswordStatus.EXPIRED })
        .where('user_uuid = :userUuid AND status = :status', {
          userUuid: user.uuid,
          status: ResetPasswordStatus.PENDING,
        })
        .execute();
      await manager.insert(ResetPasswordEntity, {
        resetToken: sha256(token),
        expiredAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        status: ResetPasswordStatus.PENDING,
        user: { uuid: user.uuid },
        createdBy: user.uuid,
      });
    });

    const link = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;
    // not awaited: waiting on SMTP would make known emails measurably slower
    this.mailerService
      .sendEmail({
        to: user.email,
        subject: 'Reset your password',
        text: `Open this link to reset your password (valid for 1 hour): ${link}`,
        body: `<p>Open this link to reset your password (valid for 1 hour):</p><p><a href="${link}">${link}</a></p><p>If you did not ask for this, ignore this email.</p>`,
      })
      .catch((error) =>
        this.logger.error('Failed to send reset email', error?.stack),
      );
    return generic;
  }

  async resetPassword(body: ResetPasswordRequestDTO) {
    if (body.newPassword !== body.confirmNewPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const resetRecord = await this.resetPasswordRepository
      .createQueryBuilder('rp')
      .innerJoinAndSelect('rp.user', 'user')
      .where('rp.resetToken = :token', { token: sha256(body.token) })
      .andWhere('rp.status = :status', { status: ResetPasswordStatus.PENDING })
      .andWhere('rp.expiredAt > :now', { now: new Date() })
      .andWhere('user.status = :userStatus', {
        userStatus: CommonStatus.ACTIVE,
      })
      .getOne();

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(body.newPassword, 10);

    await this.dataSource.transaction(async (manager) => {
      // only one request can flip PENDING to COMPLETED, so a token works once
      const consumed = await manager.update(
        ResetPasswordEntity,
        { uuid: resetRecord.uuid, status: ResetPasswordStatus.PENDING },
        { status: ResetPasswordStatus.COMPLETED },
      );
      if (!consumed.affected) {
        throw new BadRequestException('Invalid or expired reset token');
      }
      await manager.update(UserEntity, resetRecord.user.uuid, {
        password: hashedPassword,
      });
    });

    try {
      await this.mailerService.sendEmail({
        to: resetRecord.user.email,
        subject: 'Password Changed Successfully',
        text: 'Your password has been changed successfully.',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">Password Changed Successfully</h2>
            <p>Your password has been changed successfully.</p>
            <p>You can now login with your new password.</p>
            <p style="color: #dc3545; margin-top: 24px;">
              <strong>If you didn't make this change, please contact support immediately.</strong>
            </p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error('Failed to send confirmation email', error?.stack);
    }

    return {
      message:
        'Password reset successfully. You can now login with your new password.',
    };
  }

  private async insertAddress(
    manager: EntityManager,
    userUuid: string,
    address: CreateUserBodyDTO['addressDetail'],
    actorId: string,
  ) {
    const inserted = await manager
      .createQueryBuilder()
      .insert()
      .into(AddressEntity)
      .values({
        province: address.province,
        district: address.district,
        subDistrict: address.subDistrict,
        postalCode: address.postalCode,
        detail: address.detail,
        user: { uuid: userUuid },
        createdBy: actorId,
      })
      .execute();
    await manager.update(UserEntity, userUuid, {
      addressDetail: { uuid: inserted.generatedMaps[0].uuid },
    });
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from '../database/user.entity';
import { CreateUserBodyDTO } from './dto/create-user.dto';
import { CommonStatus } from '../enum/common.status';
import { UpdateUserBodyDTO } from './dto/update-user.dto';
import {
  ParamUserDTO,
  ParamUserListRequestBodyDTO,
} from './dto/param-user.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {
  RegisterByEmailDTO,
  RegisterRequestDTO,
} from './dto/register-request.dto';
import { JwtService } from '@nestjs/jwt';
import { SignInRequestDTO } from './dto/sign-in-request.dto';
import { ResetPasswordEntity } from '../database/reset-password.entity';
import { ResetPasswordRequestDTO } from './dto/reset-password.request.dto';
import { ResetPasswordStatus } from '../enum/reset.password.status';
import { AddressEntity } from '../database/address.entity';
import { MerchantEntity } from '../database/merchant.entity';

@Injectable()
export class UserService {
  mailerService: any;
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ResetPasswordEntity)
    private readonly resetPasswordRepository: Repository<ResetPasswordEntity>,
    @InjectRepository(AddressEntity)
    private readonly addressRepository: Repository<AddressEntity>,
    @InjectRepository(MerchantEntity)
    private readonly merchantRepository: Repository<MerchantEntity>,
    private readonly jwtService: JwtService,
    private dataSource: DataSource,
  ) {}

  async createUser(body: CreateUserBodyDTO, token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const userId = payload.id;

      const user = await this.userRepository
        .createQueryBuilder('u')
        .insert()
        .into(UserEntity)
        .values({
          name: body.name,
          lastName: body.lastName,
          phoneNumber: body.phoneNumber,
          status: CommonStatus.ACTIVE,
          createdBy: 'system',
          createdAt: new Date(),
        })
        .execute();

      if (user.generatedMaps.length > 0) {
        const address = await this.addressRepository
          .createQueryBuilder()
          .insert()
          .into(AddressEntity)
          .values({
            province: body.addressDetail.province,
            district: body.addressDetail.district,
            subDistrict: body.addressDetail.subDistrict,
            postalCode: body.addressDetail.postalCode,
            detail: body.addressDetail.detail,
            user: { uuid: user.generatedMaps[0].uuid },
            createdBy: 'system',
            createdAt: new Date(),
          })
          .execute();

        if (address.generatedMaps.length > 0) {
          await this.userRepository
            .createQueryBuilder()
            .update(UserEntity)
            .set({ addressDetail: { uuid: address.generatedMaps[0].uuid } })
            .where('uuid = :uuid', { uuid: user.generatedMaps[0].uuid })
            .execute();
        }
      }

      return {
        success: true,
        message: 'User created successfully',
        data: user,
      };
    } catch (error) {
      throw error;
    }
  }

  async findAllUsers(
    body: ParamUserListRequestBodyDTO,
    offset: number,
    limit: number,
  ) {
    try {
      const users = await this.userRepository
        .createQueryBuilder('u')
        .leftJoinAndSelect('u.addressDetail', 'a')
        .select([
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
        ])
        .where('u.status = :status', { status: CommonStatus.ACTIVE })
        .andWhere('u.uuid IN (:...ids)', { ids: body.ids ?? [] })
        .orderBy('u.createdAt', 'DESC')
        .skip(offset)
        .take(limit)
        .getRawMany();

      return {
        success: true,
        message: 'Users fetched successfully',
        data: users,
      };
    } catch (error) {
      throw error;
    }
  }

  async findUserByUuid(param: ParamUserDTO) {
    try {
      const user = await this.userRepository
        .createQueryBuilder('u')
        .leftJoinAndSelect('u.addressDetail', 'a')
        .select([
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
        ])
        .where('u.uuid = :id', { id: param.id })
        .andWhere('u.status = :status', { status: CommonStatus.ACTIVE })
        .getOne();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        success: true,
        message: 'User fetched successfully',
        data: user,
      };
    } catch (error) {
      throw error;
    }
  }

  async updateUser(param: ParamUserDTO, body: UpdateUserBodyDTO) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const currentUser = await this.userRepository
        .createQueryBuilder('u')
        .leftJoinAndSelect('u.addressDetail', 'a')
        .where('u.uuid = :id', { id: param.id })
        .andWhere('u.status = :status', { status: CommonStatus.ACTIVE })
        .getOne();

      if (!currentUser) {
        throw new NotFoundException('User not found');
      }

      const user = await this.userRepository
        .createQueryBuilder()
        .update(UserEntity)
        .set({
          name: {
            th: body.name.th,
            en: body.name.en,
          },
          lastName: {
            th: body.lastName.th,
            en: body.lastName.en,
          },
          phoneNumber: body.phoneNumber,
          createdBy: currentUser.uuid,
          updatedBy: 'system',
          updatedAt: new Date(),
        })
        .where('uuid = :uuid', { uuid: currentUser.uuid })
        .execute();

      if (currentUser.addressDetail?.uuid && body.addressDetail) {
        await this.addressRepository
          .createQueryBuilder()
          .update(AddressEntity)
          .set({
            province: body.addressDetail.province,
            district: body.addressDetail.district,
            subDistrict: body.addressDetail.subDistrict,
            postalCode: body.addressDetail.postalCode,
            detail: body.addressDetail.detail,
            updatedBy: 'system',
            updatedAt: new Date(),
          })
          .where('uuid = :uuid', { uuid: currentUser.addressDetail?.uuid })
          .execute();
      } else {
        const address = await this.addressRepository
          .createQueryBuilder()
          .insert()
          .into(AddressEntity)
          .values({
            province: body.addressDetail.province,
            district: body.addressDetail.district,
            subDistrict: body.addressDetail.subDistrict,
            postalCode: body.addressDetail.postalCode,
            detail: body.addressDetail.detail,
            user: { uuid: currentUser.uuid },
            createdBy: 'system',
            createdAt: new Date(),
          })
          .execute();

        await this.userRepository
          .createQueryBuilder()
          .update(UserEntity)
          .set({ addressDetail: { uuid: address.generatedMaps[0].uuid } })
          .where('uuid = :uuid', { uuid: currentUser.uuid })
          .execute();
      }

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'User updated successfully',
        data: user,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteUser(param: ParamUserDTO) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const currentUser = await this.userRepository
        .createQueryBuilder('u')
        .leftJoinAndSelect('u.addressDetail', 'a')
        .leftJoinAndSelect('u.merchant', 'm')
        .where('u.uuid = :id', { id: param.id })
        .andWhere('u.status != :status', { status: CommonStatus.DELETED })
        .getOne();

      if (!currentUser) {
        throw new NotFoundException('User not found');
      }

      await this.userRepository
        .createQueryBuilder()
        .update(UserEntity)
        .set({
          status: CommonStatus.DELETED,
          updatedBy: 'system',
          updatedAt: new Date(),
        })
        .where('uuid = :uuid', { uuid: currentUser.uuid })
        .execute();

      if (currentUser.merchant?.uuid) {
        await this.merchantRepository
          .createQueryBuilder()
          .update(MerchantEntity)
          .set({
            status: CommonStatus.DELETED,
            updatedBy: 'system',
            updatedAt: new Date(),
          })
          .where('uuid = :uuid', { uuid: currentUser.merchant.uuid })
          .execute();
      }

      if (currentUser.addressDetail?.uuid) {
        await this.addressRepository
          .createQueryBuilder()
          .update(AddressEntity)
          .set({
            deletedAt: new Date(),
          })
          .where('uuid = :uuid', { uuid: currentUser.addressDetail.uuid })
          .execute();
      }

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'User deleted successfully',
        data: null,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async signIn(body: SignInRequestDTO): Promise<any> {
    try {
      const user = await this.userRepository
        .createQueryBuilder('u')
        .where('u.email = :email', { email: body.email })
        .andWhere('u.status = :status', { status: CommonStatus.ACTIVE })
        .getOne();

      if (!user) {
        throw new NotFoundException({
          message: 'User not found',
        });
      }
      const isPasswordValid = await bcrypt.compare(
        body.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new BadRequestException({
          message: 'Invalid email or password',
        });
      }

      const accessToken = this.jwtService.sign({
        id: user.uuid,
      });

      return {
        accessToken,
        user: {
          uuid: user.uuid,
        },
      };
    } catch (error) {
      throw new Error(error);
    }
  }

  async register(body: RegisterRequestDTO) {
    try {
      const user = await this.userRepository
        .createQueryBuilder('u')
        .where('u.email = :email', { email: body.email })
        .andWhere('u.status = :status', { status: CommonStatus.ACTIVE })
        .getRawOne();

      if (user) {
        throw new BadRequestException({
          message: 'Email already exists',
        });
      }

      if (body.password !== body.confirmPassword) {
        throw new BadRequestException({
          message: 'Password and Confirm Password do not match',
        });
      }
      const hashedPassword = await bcrypt.hash(body.password, 10);

      const newUser = await this.userRepository
        .createQueryBuilder('u')
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
        user: {
          uuid: newUser.raw[0].uuid,
          email: newUser.raw[0].email,
        },
      };
    } catch (error) {
      throw new Error(error);
    }
  }

  async registerByEmail(body: RegisterByEmailDTO) {
    try {
      const email = await this.userRepository
        .createQueryBuilder('u')
        .where('u.email = :email', { email: body.email })
        .andWhere('u.status = :status', { status: CommonStatus.ACTIVE })
        .getRawOne();

      if (email) {
        throw new BadRequestException({
          message: 'Email already exists',
        });
      }

      const password = uuidv4();
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = this.userRepository
        .createQueryBuilder('u')
        .insert()
        .into(UserEntity)
        .values({
          email: body.email,
          password: hashedPassword,
        })
        .execute();

      const mailer = await this.mailerService.sendEmail({
        to: body.email,
        subject: 'Account Registration',
        body: `Your account has been created. Your password is ${password} Please change your password after logging in.`,
        text: `Your account has been created. Your password is ${password} Please change your password after logging in.`,
      });

      if (mailer.failed.length) {
        throw new BadRequestException({
          message: 'Cannot send email to your address',
        });
      }

      return newUser;
    } catch (error) {
      throw new Error(error);
    }
  }

  async resetPassword(body: ResetPasswordRequestDTO, token: string) {
    try {
      const payload = this.jwtService.verify(token);

      if (payload.type !== 'password-reset') {
        throw new BadRequestException('Invalid token type');
      }

      const resetRecord = await this.resetPasswordRepository
        .createQueryBuilder('rp')
        .leftJoinAndSelect('rp.user', 'user')
        .where('rp.resetToken = :token', { token })
        .andWhere('rp.status = :status', {
          status: ResetPasswordStatus.PENDING,
        })
        .andWhere('rp.expiredAt > :now', { now: new Date() })
        .andWhere('user.uuid = :userId', { userId: payload.sub })
        .andWhere('user.status = :userStatus', {
          userStatus: CommonStatus.ACTIVE,
        })
        .getOne();

      if (!resetRecord) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      if (body.newPassword !== body.confirmNewPassword) {
        throw new BadRequestException('Passwords do not match');
      }

      const hashedPassword = await bcrypt.hash(body.newPassword, 10);

      await this.userRepository
        .createQueryBuilder()
        .update(UserEntity)
        .set({ password: hashedPassword })
        .where('uuid = :uuid', { uuid: resetRecord.user.uuid })
        .execute();

      await this.resetPasswordRepository
        .createQueryBuilder()
        .update(ResetPasswordEntity)
        .set({ status: ResetPasswordStatus.EXPIRED })
        .where('uuid = :uuid', { uuid: resetRecord.uuid })
        .execute();

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
                <strong>⚠️ If you didn't make this change, please contact support immediately.</strong>
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }

      return {
        message:
          'Password reset successfully. You can now login with your new password.',
      };
    } catch (error) {
      throw new Error(error);
    }
  }
}

import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../database/user.entity';
import { MailerAppModule } from '../mailer/mailer.module';
import { PaginationModule } from '../pagination/pagination.mudule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ResetPasswordEntity } from '../database/reset-password.entity';
import { AddressEntity } from '../database/address.entity';
import { MerchantEntity } from '../database/merchant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      ResetPasswordEntity,
      AddressEntity,
      MerchantEntity,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '7d',
        },
      }),
    }),
    MailerAppModule,
    PaginationModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressEntity } from '../database/address.entity';
import { MerchantEntity } from '../database/merchant.entity';
import { ResetPasswordEntity } from '../database/reset-password.entity';
import { UserEntity } from '../database/user.entity';
import { MailerAppModule } from '../mailer/mailer.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      ResetPasswordEntity,
      AddressEntity,
      MerchantEntity,
    ]),
    MailerAppModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}

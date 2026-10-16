import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { TemplateEntity } from './template.entity';
import { CommonStatus } from '../enum/common.status';
import { AddressEntity } from './address.entity';
import { RoleType } from '../enum/role.status';
import { ResetPasswordEntity } from './reset-password.entity';
import { MerchantEntity } from './merchant.entity';

@Entity('user')
// emails are lower-cased in the service; deleted users free their email
@Index('UQ_user_email_active', ['email'], {
  unique: true,
  where: `"status" <> 'deleted'`,
})
export class UserEntity extends TemplateEntity {
  @Column({ type: 'jsonb', nullable: true })
  name: {
    th: string;
    en: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  lastName: {
    th: string;
    en: string;
  };

  @Column({ type: 'varchar', nullable: true })
  email: string;

  @Column({ type: 'enum', enum: CommonStatus, nullable: true })
  status: CommonStatus;

  @Column({ type: 'varchar', nullable: true })
  phoneNumber: string;

  @Column({ type: 'varchar', nullable: true })
  password: string;

  @OneToOne(() => AddressEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'address_uuid' })
  addressDetail: AddressEntity;

  @Column({ type: 'enum', enum: RoleType, default: RoleType.USER })
  role: RoleType;

  @OneToMany(() => ResetPasswordEntity, (resetpassword) => resetpassword.user)
  resetPassword: ResetPasswordEntity[];

  @OneToOne(() => MerchantEntity, (merchant) => merchant.user, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'merchant_uuid' })
  merchant: MerchantEntity;
}

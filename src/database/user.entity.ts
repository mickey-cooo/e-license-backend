import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { TemplateEntity } from './template.entity';
import { CommonStatus } from '../enum/common.status';
import { AddressEntity } from './address.entity';
import { RoleEntity } from './role.entity';
import { ResetPasswordEntity } from './reset-password.entity';
import { MerchantEntity } from './merchant.entity';

@Entity('user')
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

  @OneToMany(() => RoleEntity, (role) => role.user_uuid)
  role_uuid: RoleEntity[];

  @OneToMany(() => ResetPasswordEntity, (resetpassword) => resetpassword.user)
  @JoinColumn({ name: 'user_uuid' })
  resetPassword: ResetPasswordEntity;

  @OneToOne(() => MerchantEntity, (merchant) => merchant.user, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'merchant_uuid' })
  merchant: MerchantEntity;
}

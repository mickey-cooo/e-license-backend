import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TemplateEntity } from './template.entity';
import { ResetPasswordStatus } from 'src/enum/reset.password.status';
import { UserEntity } from './user.entity';

@Entity('reset_password')
export class ResetPasswordEntity extends TemplateEntity {
  @Column({ type: 'varchar' })
  resetToken: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  expiredAt: Date;

  @Column({
    type: 'enum',
    enum: ResetPasswordStatus,
    default: ResetPasswordStatus.PENDING,
  })
  status: ResetPasswordStatus;

  @ManyToOne(() => UserEntity, (user) => user.resetPassword)
  @JoinColumn({ name: 'user_uuid' })
  user: UserEntity;
}

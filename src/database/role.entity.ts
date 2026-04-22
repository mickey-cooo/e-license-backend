import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TemplateEntity } from './template.entity';

import { UserEntity } from './user.entity';
import { RoleType } from '../enum/role.status';
import { CommonStatus } from '../enum/common.status';

@Entity('role')
export class RoleEntity extends TemplateEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  additionalInfo: string;

  @Column({ type: 'integer' })
  priority: number;

  @Column({ type: 'enum', enum: CommonStatus, default: CommonStatus.ACTIVE })
  status: CommonStatus;

  @ManyToOne(() => UserEntity, (user) => user.role_uuid)
  @JoinColumn({ name: 'user_uuid' })
  user_uuid: UserEntity;
}

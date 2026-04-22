import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { TemplateEntity } from './template.entity';
import { UserEntity } from './user.entity';

@Entity('address')
export class AddressEntity extends TemplateEntity {
  @Column({ type: 'varchar', nullable: true })
  province: string;

  @Column({ type: 'varchar', nullable: true })
  district: string;

  @Column({ type: 'varchar', nullable: true })
  subDistrict: string;

  @Column({ type: 'varchar', nullable: true })
  postalCode: string;

  @Column({ type: 'jsonb', nullable: true })
  detail: string;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'user_uuid' })
  user: UserEntity;
}

import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { TemplateEntity } from './template.entity';
import { CommonStatus, ELicenseMerchantType } from '../enum/common.status';
import { DocumentRequestEntity } from './document-request.entity';
import { UserEntity } from './user.entity';

@Entity('merchant')
export class MerchantEntity extends TemplateEntity {
  @Column({ type: 'varchar' })
  merchantName: string;

  @Column({ type: 'varchar' })
  businessRegistrationNumber: string;

  @Column({ type: 'varchar' })
  taxId: string;

  @Column({ type: 'enum', enum: ELicenseMerchantType })
  merchantType: ELicenseMerchantType;

  @Column({ type: 'varchar' })
  contactName: string;

  @Column({ type: 'varchar' })
  contactEmail: string;

  @Column({ type: 'varchar' })
  contactPhoneNumber: string;

  @Column({ type: 'text', nullable: true })
  businessAddress: string;

  @Column({ type: 'jsonb', nullable: true })
  licenseAnalysisSnapshot?: Record<string, unknown>;

  @Column({ type: 'enum', enum: CommonStatus, default: CommonStatus.PENDING })
  status: CommonStatus;

  @OneToMany(() => DocumentRequestEntity, (document) => document.merchant)
  documents: DocumentRequestEntity[];

  @OneToOne(() => UserEntity, (user) => user.merchant)
  user: UserEntity;
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantEntity } from '../database/merchant.entity';
import { CreateMerchantBodyDTO } from './dto/create-merchant.dto';
import { CommonStatus } from '../enum/common.status';
import { ParamMerchantDTO } from './dto/param-merchant.dto';
import { UpdateMerchantBodyDTO } from './dto/update-merchant.dto';
import { QueryMerchantDTO } from './dto/query-merchant.dto';
import { ReviewMerchantBodyDTO } from './dto/review-merchant.dto';
import { LicenseAdvisoryService } from '../license-advisory/license-advisory.service';
import { AnalyzeLicenseRequestDTO } from '../license-advisory/dto/analyze-license.dto';

@Injectable()
export class MerchantService {
  constructor(
    @InjectRepository(MerchantEntity)
    private readonly merchantRepository: Repository<MerchantEntity>,
    private readonly licenseAdvisoryService: LicenseAdvisoryService,
  ) {}

  async createMerchant(body: CreateMerchantBodyDTO) {
    const licenseAnalysisInput: AnalyzeLicenseRequestDTO = {
      merchantType: body.merchantType,
      businessActivities: body.businessActivities ?? [],
      handlesHazardousMaterial: body.handlesHazardousMaterial ?? false,
      hasAlcoholService: body.hasAlcoholService ?? false,
      hasFoodPreparation: body.hasFoodPreparation ?? false,
    };

    const licenseAnalysis = await this.licenseAdvisoryService.analyzeLicenses(
      licenseAnalysisInput,
    );

    const licenseAnalysisSnapshot = {
      requestedAt: new Date().toISOString(),
      input: licenseAnalysisInput,
      result: licenseAnalysis.data,
    };

    const merchant = await this.merchantRepository
      .createQueryBuilder()
      .insert()
      .into(MerchantEntity)
      .values({
        merchantName: body.merchantName,
        businessRegistrationNumber: body.businessRegistrationNumber,
        taxId: body.taxId,
        merchantType: body.merchantType,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhoneNumber: body.contactPhoneNumber,
        businessAddress: body.businessAddress,
        licenseAnalysisSnapshot,
        status: CommonStatus.PENDING,
        createdBy: 'system',
        createdAt: new Date(),
      })
      .execute();

    return {
      success: true,
      message:
        'Merchant registration created successfully with license analysis',
      data: {
        merchant: {
          ...(merchant.generatedMaps[0] ?? {}),
          licenseAnalysisSnapshot,
        },
        licenseAnalysis: licenseAnalysis.data,
      },
    };
  }

  async findAllMerchants(query: QueryMerchantDTO) {
    const queryBuilder = this.merchantRepository
      .createQueryBuilder('m')
      .select([
        'm.uuid AS "uuid"',
        'm.merchantName AS "merchantName"',
        'm.businessRegistrationNumber AS "businessRegistrationNumber"',
        'm.taxId AS "taxId"',
        'm.merchantType AS "merchantType"',
        'm.contactName AS "contactName"',
        'm.contactEmail AS "contactEmail"',
        'm.contactPhoneNumber AS "contactPhoneNumber"',
        'm.businessAddress AS "businessAddress"',
        'm.licenseAnalysisSnapshot AS "licenseAnalysisSnapshot"',
        'm.status AS "status"',
        'm.createdAt AS "createdAt"',
        'm.updatedAt AS "updatedAt"',
        'm.updatedBy AS "updatedBy"',
      ])
      .where('m.status != :status', { status: CommonStatus.DELETED })
      .orderBy('m.createdAt', 'DESC');

    if (query.status) {
      queryBuilder.andWhere('m.status = :merchantStatus', {
        merchantStatus: query.status,
      });
    }

    if (query.merchantType) {
      queryBuilder.andWhere('m.merchantType = :merchantType', {
        merchantType: query.merchantType,
      });
    }

    if (query.name) {
      queryBuilder.andWhere('LOWER(m.merchantName) LIKE :name', {
        name: `%${query.name.trim().toLowerCase()}%`,
      });
    }

    const merchants = await queryBuilder
      .skip(query.offset)
      .take(query.limit)
      .getRawMany();

    return {
      success: true,
      message: 'Merchants fetched successfully',
      data: merchants,
    };
  }

  async findMerchantByUuid(param: ParamMerchantDTO) {
    const merchant = await this.getActiveMerchantByUuidOrThrow(param.id);

    return {
      success: true,
      message: 'Merchant fetched successfully',
      data: merchant,
    };
  }

  async getActiveMerchantByUuidOrThrow(id: string) {
    const merchant = await this.merchantRepository
      .createQueryBuilder('m')
      .where('m.uuid = :id', { id })
      .andWhere('m.status != :status', { status: CommonStatus.DELETED })
      .getOne();

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return merchant;
  }

  async updateMerchant(param: ParamMerchantDTO, body: UpdateMerchantBodyDTO) {
    const currentMerchant = await this.merchantRepository
      .createQueryBuilder('m')
      .where('m.uuid = :id', { id: param.id })
      .andWhere('m.status != :status', { status: CommonStatus.DELETED })
      .getOne();

    if (!currentMerchant) {
      throw new NotFoundException('Merchant not found');
    }

    const currentSnapshot = currentMerchant.licenseAnalysisSnapshot as
      | {
          input?: Partial<AnalyzeLicenseRequestDTO>;
        }
      | undefined;

    const resolvedLicenseInput: AnalyzeLicenseRequestDTO = {
      merchantType: body.merchantType ?? currentMerchant.merchantType,
      businessActivities:
        body.businessActivities ??
        currentSnapshot?.input?.businessActivities ??
        [],
      handlesHazardousMaterial:
        body.handlesHazardousMaterial ??
        currentSnapshot?.input?.handlesHazardousMaterial ??
        false,
      hasAlcoholService:
        body.hasAlcoholService ??
        currentSnapshot?.input?.hasAlcoholService ??
        false,
      hasFoodPreparation:
        body.hasFoodPreparation ??
        currentSnapshot?.input?.hasFoodPreparation ??
        false,
    };

    const shouldRefreshLicenseSnapshot =
      body.merchantType !== undefined ||
      body.businessActivities !== undefined ||
      body.handlesHazardousMaterial !== undefined ||
      body.hasAlcoholService !== undefined ||
      body.hasFoodPreparation !== undefined;

    let licenseAnalysisSnapshot = currentMerchant.licenseAnalysisSnapshot;

    if (shouldRefreshLicenseSnapshot) {
      const licenseAnalysis = await this.licenseAdvisoryService.analyzeLicenses(
        resolvedLicenseInput,
      );

      licenseAnalysisSnapshot = {
        requestedAt: new Date().toISOString(),
        input: resolvedLicenseInput,
        result: licenseAnalysis.data,
      };
    }

    await this.merchantRepository
      .createQueryBuilder()
      .update(MerchantEntity)
      .set({
        merchantName: body.merchantName ?? currentMerchant.merchantName,
        businessRegistrationNumber:
          body.businessRegistrationNumber ??
          currentMerchant.businessRegistrationNumber,
        taxId: body.taxId ?? currentMerchant.taxId,
        merchantType: body.merchantType ?? currentMerchant.merchantType,
        contactName: body.contactName ?? currentMerchant.contactName,
        contactEmail: body.contactEmail ?? currentMerchant.contactEmail,
        contactPhoneNumber:
          body.contactPhoneNumber ?? currentMerchant.contactPhoneNumber,
        businessAddress: body.businessAddress ?? currentMerchant.businessAddress,
        licenseAnalysisSnapshot: (licenseAnalysisSnapshot ?? null) as any,
        updatedBy: 'system',
        updatedAt: new Date(),
      })
      .where('uuid = :uuid', { uuid: currentMerchant.uuid })
      .execute();

    return {
      success: true,
      message: 'Merchant updated successfully',
      data: {
        uuid: currentMerchant.uuid,
        licenseAnalysisSnapshot,
      },
    };
  }

  async deleteMerchant(param: ParamMerchantDTO) {
    const currentMerchant = await this.merchantRepository
      .createQueryBuilder('m')
      .where('m.uuid = :id', { id: param.id })
      .andWhere('m.status != :status', { status: CommonStatus.DELETED })
      .getOne();

    if (!currentMerchant) {
      throw new NotFoundException('Merchant not found');
    }

    await this.merchantRepository
      .createQueryBuilder()
      .update(MerchantEntity)
      .set({
        status: CommonStatus.DELETED,
        updatedBy: 'system',
        updatedAt: new Date(),
      })
      .where('uuid = :uuid', { uuid: currentMerchant.uuid })
      .execute();

    return {
      success: true,
      message: 'Merchant deleted successfully',
      data: null,
    };
  }

  async reviewMerchant(param: ParamMerchantDTO, body: ReviewMerchantBodyDTO) {
    const currentMerchant = await this.merchantRepository
      .createQueryBuilder('m')
      .where('m.uuid = :id', { id: param.id })
      .andWhere('m.status != :status', { status: CommonStatus.DELETED })
      .getOne();

    if (!currentMerchant) {
      throw new NotFoundException('Merchant not found');
    }

    if (currentMerchant.status !== CommonStatus.PENDING) {
      throw new BadRequestException(
        'Only pending merchant can be approved or rejected',
      );
    }

    if (
      body.status !== CommonStatus.APPROVED &&
      body.status !== CommonStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Status must be approved or rejected for review workflow',
      );
    }

    const updatedBy = body.remark?.trim()
      ? `system:${body.status}:${body.remark.trim()}`
      : `system:${body.status}`;

    await this.merchantRepository
      .createQueryBuilder()
      .update(MerchantEntity)
      .set({
        status: body.status,
        updatedBy,
        updatedAt: new Date(),
      })
      .where('uuid = :uuid', { uuid: currentMerchant.uuid })
      .execute();

    return {
      success: true,
      message: `Merchant ${body.status} successfully`,
      data: null,
    };
  }

  async analyzeRequiredLicenses(body: AnalyzeLicenseRequestDTO) {
    return this.licenseAdvisoryService.analyzeLicenses(body);
  }
}

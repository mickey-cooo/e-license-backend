import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MerchantEntity } from '../database/merchant.entity';
import { UserEntity } from '../database/user.entity';
import { CommonStatus } from '../enum/common.status';
import { AnalyzeLicenseRequestDTO } from '../license-advisory/dto/analyze-license.dto';
import { LicenseAdvisoryService } from '../license-advisory/license-advisory.service';
import { type Actor, isAdmin } from '../utils/auth/actor';
import { CreateMerchantBodyDTO } from './dto/create-merchant.dto';
import { ParamMerchantDTO } from './dto/param-merchant.dto';
import { QueryMerchantDTO } from './dto/query-merchant.dto';
import { ReviewMerchantBodyDTO } from './dto/review-merchant.dto';
import { UpdateMerchantBodyDTO } from './dto/update-merchant.dto';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class MerchantService {
  constructor(
    @InjectRepository(MerchantEntity)
    private readonly merchantRepository: Repository<MerchantEntity>,
    private readonly licenseAdvisoryService: LicenseAdvisoryService,
    private readonly dataSource: DataSource,
  ) {}

  async createMerchant(body: CreateMerchantBodyDTO, actor: Actor) {
    const licenseAnalysisInput: AnalyzeLicenseRequestDTO = {
      merchantType: body.merchantType,
      businessActivities: body.businessActivities ?? [],
      handlesHazardousMaterial: body.handlesHazardousMaterial ?? false,
      hasAlcoholService: body.hasAlcoholService ?? false,
      hasFoodPreparation: body.hasFoodPreparation ?? false,
    };

    const licenseAnalysis =
      await this.licenseAdvisoryService.analyzeLicenses(licenseAnalysisInput);

    const licenseAnalysisSnapshot = {
      requestedAt: new Date().toISOString(),
      input: licenseAnalysisInput,
      result: licenseAnalysis.data,
    };

    let merchant;
    try {
      merchant = await this.dataSource.transaction(async (manager) => {
        // the row lock stops two parallel requests from both passing the check
        await manager
          .createQueryBuilder(UserEntity, 'u')
          .setLock('pessimistic_write')
          .where('u.uuid = :id', { id: actor.id })
          .getOneOrFail();
        const hasMerchant = await manager
          .createQueryBuilder(MerchantEntity, 'm')
          .innerJoin('m.user', 'u', 'u.uuid = :id', { id: actor.id })
          .where('m.status != :deleted', { deleted: CommonStatus.DELETED })
          .getExists();
        if (hasMerchant) {
          throw new BadRequestException('This user already has a merchant');
        }

        const inserted = await manager
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
            createdBy: actor.id,
          })
          .execute();
        await manager.update(UserEntity, actor.id, {
          merchant: { uuid: inserted.generatedMaps[0].uuid },
        });
        return inserted.generatedMaps[0];
      });
    } catch (error) {
      if (error?.code === PG_UNIQUE_VIOLATION) {
        throw new BadRequestException(
          'A merchant with this tax ID or registration number already exists',
        );
      }
      throw error;
    }

    return {
      success: true,
      message:
        'Merchant registration created successfully with license analysis',
      data: {
        merchant: {
          ...merchant,
          licenseAnalysisSnapshot,
        },
        licenseAnalysis: licenseAnalysis.data,
      },
    };
  }

  async findAllMerchants(query: QueryMerchantDTO) {
    const queryBuilder = this.merchantRepository
      .createQueryBuilder('m')
      .where('m.status != :status', { status: CommonStatus.DELETED });

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

    const total = await queryBuilder.getCount();
    const merchants = await queryBuilder
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
        'm.reviewedBy AS "reviewedBy"',
        'm.reviewRemark AS "reviewRemark"',
      ])
      .orderBy('m.createdAt', 'DESC')
      .offset(query.offset)
      .limit(query.limit)
      .getRawMany();

    return {
      success: true,
      message: 'Merchants fetched successfully',
      data: merchants,
      total,
    };
  }

  async findMyMerchant(actor: Actor) {
    const merchant = await this.merchantRepository
      .createQueryBuilder('m')
      .innerJoin('m.user', 'u', 'u.uuid = :userId', { userId: actor.id })
      .where('m.status != :status', { status: CommonStatus.DELETED })
      .getOne();

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return {
      success: true,
      message: 'Merchant fetched successfully',
      data: merchant,
    };
  }

  async findMerchantByUuid(param: ParamMerchantDTO, actor: Actor) {
    const merchant = await this.assertCanAccessMerchant(actor, param.id);

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

  // admins can use any merchant; everyone else only the one they own
  async assertCanAccessMerchant(actor: Actor, merchantId: string) {
    const merchant = await this.getActiveMerchantByUuidOrThrow(merchantId);
    if (isAdmin(actor)) {
      return merchant;
    }
    const isOwner = await this.merchantRepository
      .createQueryBuilder('m')
      .innerJoin('m.user', 'u', 'u.uuid = :userId', { userId: actor.id })
      .where('m.uuid = :id', { id: merchantId })
      .getExists();
    if (!isOwner) {
      throw new ForbiddenException();
    }
    return merchant;
  }

  async updateMerchant(
    param: ParamMerchantDTO,
    body: UpdateMerchantBodyDTO,
    actor: Actor,
  ) {
    const currentMerchant = await this.assertCanAccessMerchant(actor, param.id);

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
      const licenseAnalysis =
        await this.licenseAdvisoryService.analyzeLicenses(resolvedLicenseInput);

      licenseAnalysisSnapshot = {
        requestedAt: new Date().toISOString(),
        input: resolvedLicenseInput,
        result: licenseAnalysis.data,
      };
    }

    // an approved merchant that changes who it is goes back to review
    const identityChanged =
      !isAdmin(actor) &&
      currentMerchant.status !== CommonStatus.PENDING &&
      ((body.merchantName ?? currentMerchant.merchantName) !==
        currentMerchant.merchantName ||
        (body.taxId ?? currentMerchant.taxId) !== currentMerchant.taxId ||
        (body.businessRegistrationNumber ??
          currentMerchant.businessRegistrationNumber) !==
          currentMerchant.businessRegistrationNumber ||
        (body.merchantType ?? currentMerchant.merchantType) !==
          currentMerchant.merchantType);

    try {
      await this.merchantRepository
        .createQueryBuilder()
        .update(MerchantEntity)
        .set({
          ...(identityChanged && { status: CommonStatus.PENDING }),
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
          businessAddress:
            body.businessAddress ?? currentMerchant.businessAddress,
          licenseAnalysisSnapshot: (licenseAnalysisSnapshot ?? null) as any,
          updatedBy: actor.id,
        })
        .where('uuid = :uuid', { uuid: currentMerchant.uuid })
        .execute();
    } catch (error) {
      if (error?.code === PG_UNIQUE_VIOLATION) {
        throw new BadRequestException(
          'A merchant with this tax ID or registration number already exists',
        );
      }
      throw error;
    }

    return {
      success: true,
      message: 'Merchant updated successfully',
      data: {
        uuid: currentMerchant.uuid,
        licenseAnalysisSnapshot,
      },
    };
  }

  async deleteMerchant(param: ParamMerchantDTO, actor: Actor) {
    const currentMerchant = await this.getActiveMerchantByUuidOrThrow(param.id);

    await this.merchantRepository.update(currentMerchant.uuid, {
      status: CommonStatus.DELETED,
      updatedBy: actor.id,
    });

    return {
      success: true,
      message: 'Merchant deleted successfully',
      data: null,
    };
  }

  async reviewMerchant(
    param: ParamMerchantDTO,
    body: ReviewMerchantBodyDTO,
    actor: Actor,
  ) {
    const currentMerchant = await this.getActiveMerchantByUuidOrThrow(param.id);

    if (currentMerchant.status !== CommonStatus.PENDING) {
      throw new BadRequestException(
        'Only pending merchant can be approved or rejected',
      );
    }

    // the status filter makes a second reviewer lose the race instead of overwriting
    const result = await this.merchantRepository.update(
      { uuid: currentMerchant.uuid, status: CommonStatus.PENDING },
      {
        status: body.status,
        reviewedBy: actor.id,
        reviewRemark: body.remark?.trim() || undefined,
        updatedBy: actor.id,
      },
    );
    if (!result.affected) {
      throw new BadRequestException(
        'Only pending merchant can be approved or rejected',
      );
    }

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

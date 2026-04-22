import { Injectable } from '@nestjs/common';
import { AnalyzeLicenseRequestDTO } from './dto/analyze-license.dto';
import {
  licenseRules,
  merchantTypeProfiles,
} from './license-advisory.constant';

@Injectable()
export class LicenseAdvisoryService {
  async getMerchantTypes() {
    try {
      return {
        success: true,
        message: 'Merchant types fetched successfully',
        data: Object.entries(merchantTypeProfiles).map(([code, profile]) => ({
          code,
          ...profile,
        })),
      };
    } catch (error) {
      throw error;
    }
  }

  async analyzeLicenses(body: AnalyzeLicenseRequestDTO) {
    try {
      const activitySet = new Set(body.businessActivities);

      const recommended = licenseRules.filter((rule) => {
        const merchantTypePass = rule.merchantTypes.includes(body.merchantType);

        const activityPass =
          rule.activityKeywords.length === 0 ||
          rule.activityKeywords.some((keyword) => activitySet.has(keyword));

        const hazardousPass =
          rule.requiresHazardous === body.handlesHazardousMaterial;

        const alcoholPass = rule.requiresAlcohol === body.hasAlcoholService;

        const foodPass =
          rule.requiresFoodPreparation === body.hasFoodPreparation;

        return (
          merchantTypePass &&
          activityPass &&
          hazardousPass &&
          alcoholPass &&
          foodPass
        );
      });

      return {
        success: true,
        message: 'License analysis completed successfully',
        data: {
          merchantType: body.merchantType,
          profile: merchantTypeProfiles[body.merchantType],
          inputActivities: Array.from(activitySet),
          recommendedLicenses: recommended,
          recommendationCount: recommended.length,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}

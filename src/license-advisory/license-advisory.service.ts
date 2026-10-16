import { Injectable } from '@nestjs/common';
import { AnalyzeLicenseRequestDTO } from './dto/analyze-license.dto';
import {
  licenseRules,
  merchantTypeProfiles,
} from './license-advisory.constant';

@Injectable()
export class LicenseAdvisoryService {
  async getMerchantTypes() {
    const merchantTypes = Object.entries(merchantTypeProfiles).map(
      ([code, profile]) => ({
        code,
        ...profile,
      }),
    );

    return {
      success: true,
      message: 'Merchant types fetched successfully',
      data: merchantTypes,
    };
  }

  async analyzeLicenses(body: AnalyzeLicenseRequestDTO) {
    const activities = body.businessActivities.map((a) =>
      a.trim().toLowerCase(),
    );

    const recommended = licenseRules.filter((rule) => {
      if (!rule.merchantTypes.includes(body.merchantType)) {
        return false;
      }

      // a rule that needs a flag only applies when the business has it
      const flagsPass =
        (!rule.requiresHazardous || !!body.handlesHazardousMaterial) &&
        (!rule.requiresAlcohol || !!body.hasAlcoholService) &&
        (!rule.requiresFoodPreparation || !!body.hasFoodPreparation);
      if (!flagsPass) {
        return false;
      }

      // a flag rule applies on the flag alone; the others need an activity keyword
      const isFlagRule =
        rule.requiresHazardous ||
        rule.requiresAlcohol ||
        rule.requiresFoodPreparation;
      return (
        isFlagRule ||
        rule.activityKeywords.length === 0 ||
        rule.activityKeywords.some((keyword) =>
          activities.some((activity) => activity.includes(keyword)),
        )
      );
    });

    return {
      success: true,
      message: 'License analysis completed successfully',
      data: {
        merchantType: body.merchantType,
        profile: merchantTypeProfiles[body.merchantType],
        inputActivities: Array.from(new Set(activities)),
        recommendedLicenses: recommended,
        recommendationCount: recommended.length,
      },
    };
  }
}

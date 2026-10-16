import { ELicenseMerchantType } from '../enum/common.status';
import { LicenseAdvisoryService } from './license-advisory.service';

const codes = async (
  input: Parameters<LicenseAdvisoryService['analyzeLicenses']>[0],
) => {
  const { data } = await new LicenseAdvisoryService().analyzeLicenses(input);
  return data.recommendedLicenses.map((rule) => rule.code).sort();
};

describe('LicenseAdvisoryService.analyzeLicenses', () => {
  it('always recommends commercial registration, even with flags left out', async () => {
    expect(
      await codes({
        merchantType: ELicenseMerchantType.RETAIL_AND_ECOMMERCE,
        businessActivities: [],
      }),
    ).toEqual(['REG-COM-001']);
  });

  it('keeps the base and food licenses when a restaurant also serves alcohol', async () => {
    expect(
      await codes({
        merchantType: ELicenseMerchantType.FOOD_AND_BEVERAGE,
        businessActivities: [],
        hasFoodPreparation: true,
        hasAlcoholService: true,
      }),
    ).toEqual(['LIC-ALC-001', 'LIC-FNB-001', 'REG-COM-001']);
  });

  it('adds the hazardous permit on the flag alone, for any merchant type', async () => {
    expect(
      await codes({
        merchantType: ELicenseMerchantType.DIGITAL_SERVICE,
        businessActivities: [],
        handlesHazardousMaterial: true,
      }),
    ).toEqual(['LIC-HAZ-001', 'REG-COM-001']);
  });

  it('does not recommend food or alcohol rules when the flags are off', async () => {
    expect(
      await codes({
        merchantType: ELicenseMerchantType.FOOD_AND_BEVERAGE,
        businessActivities: [],
        hasFoodPreparation: false,
        hasAlcoholService: false,
      }),
    ).toEqual(['REG-COM-001']);
  });

  it('matches activity keywords inside a phrase, ignoring case and spaces', async () => {
    expect(
      await codes({
        merchantType: ELicenseMerchantType.HOTEL_AND_ACCOMMODATION,
        businessActivities: ['  Boutique HOTEL rooms '],
      }),
    ).toEqual(['LIC-HOT-001', 'REG-COM-001']);
  });

  it('skips a rule for another merchant type even if the keyword matches', async () => {
    expect(
      await codes({
        merchantType: ELicenseMerchantType.RETAIL_AND_ECOMMERCE,
        businessActivities: ['factory'],
      }),
    ).toEqual(['REG-COM-001']);
  });
});

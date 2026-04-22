import { ELicenseMerchantType } from '../enum/common.status';

export type MerchantTypeProfile = {
  label: string;
  description: string;
};

export type LicenseRule = {
  code: string;
  name: string;
  authority: string;
  reason: string;
  note?: string;
  merchantTypes: ELicenseMerchantType[];
  activityKeywords: string[];
  requiresHazardous: boolean;
  requiresAlcohol: boolean;
  requiresFoodPreparation: boolean;
};

export const merchantTypeProfiles: Record<
  ELicenseMerchantType,
  MerchantTypeProfile
> = {
  [ELicenseMerchantType.FOOD_AND_BEVERAGE]: {
    label: 'Food and Beverage',
    description: 'Restaurants, cafes, street food, and beverage operators.',
  },
  [ELicenseMerchantType.HOTEL_AND_ACCOMMODATION]: {
    label: 'Hotel and Accommodation',
    description: 'Hotels, hostels, serviced apartments, and short-stay operations.',
  },
  [ELicenseMerchantType.TOURISM_AND_TRAVEL]: {
    label: 'Tourism and Travel',
    description: 'Tour operators, travel agencies, guides, and tourism services.',
  },
  [ELicenseMerchantType.HEALTH_AND_WELLNESS]: {
    label: 'Health and Wellness',
    description: 'Clinics, spas, wellness centers, beauty services, and care services.',
  },
  [ELicenseMerchantType.EDUCATION_AND_TRAINING]: {
    label: 'Education and Training',
    description: 'Private schools, training centers, and tutoring businesses.',
  },
  [ELicenseMerchantType.MANUFACTURING]: {
    label: 'Manufacturing',
    description: 'Factories and production lines, including packaged consumer goods.',
  },
  [ELicenseMerchantType.IMPORT_EXPORT]: {
    label: 'Import and Export',
    description: 'Cross-border product trading, customs related, and bonded services.',
  },
  [ELicenseMerchantType.TRANSPORT_AND_LOGISTICS]: {
    label: 'Transport and Logistics',
    description: 'Freight, warehousing, fleet operation, and logistics hubs.',
  },
  [ELicenseMerchantType.CONSTRUCTION]: {
    label: 'Construction',
    description: 'Construction contractors, engineering works, and project management.',
  },
  [ELicenseMerchantType.RETAIL_AND_ECOMMERCE]: {
    label: 'Retail and E-commerce',
    description: 'Retail shops, online marketplaces, and direct sellers.',
  },
  [ELicenseMerchantType.ENVIRONMENTAL_SERVICE]: {
    label: 'Environmental Service',
    description: 'Waste handling, recycling, treatment, and environmental operations.',
  },
  [ELicenseMerchantType.DIGITAL_SERVICE]: {
    label: 'Digital Service',
    description: 'SaaS, digital platforms, software providers, and online service businesses.',
  },
  [ELicenseMerchantType.OTHER]: {
    label: 'Other',
    description: 'Uncategorized businesses requiring case-by-case analysis.',
  },
};

export const licenseRules: LicenseRule[] = [
  {
    code: 'REG-COM-001',
    name: 'Commercial Registration',
    authority: 'Department of Business Development',
    reason: 'Every business operation must be formally registered.',
    merchantTypes: Object.values(ELicenseMerchantType),
    activityKeywords: [],
    requiresHazardous: false,
    requiresAlcohol: false,
    requiresFoodPreparation: false,
  },
  {
    code: 'LIC-FNB-001',
    name: 'Food Establishment License',
    authority: 'Local Administrative Organization',
    reason: 'Required for operations that prepare or serve food.',
    merchantTypes: [
      ELicenseMerchantType.FOOD_AND_BEVERAGE,
      ELicenseMerchantType.HOTEL_AND_ACCOMMODATION,
    ],
    activityKeywords: [],
    requiresHazardous: false,
    requiresAlcohol: false,
    requiresFoodPreparation: true,
  },
  {
    code: 'LIC-ALC-001',
    name: 'Alcohol Sale Permit',
    authority: 'Excise Department',
    reason: 'Required when selling or serving alcoholic beverages.',
    merchantTypes: Object.values(ELicenseMerchantType),
    requiresAlcohol: true,
    activityKeywords: ['alcohol', 'bar', 'pub', 'liquor', 'beer', 'wine'],
    requiresHazardous: false,
    requiresFoodPreparation: false,
  },
  {
    code: 'LIC-HOT-001',
    name: 'Hotel Operation License',
    authority: 'Department of Provincial Administration',
    reason: 'Required for accommodation and room-rental business operations.',
    merchantTypes: [ELicenseMerchantType.HOTEL_AND_ACCOMMODATION],
    activityKeywords: ['hotel', 'hostel', 'accommodation'],
    requiresHazardous: false,
    requiresAlcohol: false,
    requiresFoodPreparation: false,
  },
  {
    code: 'LIC-FAC-001',
    name: 'Factory License',
    authority: 'Department of Industrial Works',
    reason:
      'Required for manufacturing operations with industrial machinery or production lines.',
    merchantTypes: [ELicenseMerchantType.MANUFACTURING],
    activityKeywords: ['manufacturing', 'factory', 'production'],
    requiresHazardous: false,
    requiresAlcohol: false,
    requiresFoodPreparation: false,
  },
  {
    code: 'LIC-IMP-001',
    name: 'Import and Export License',
    authority: 'Customs Department',
    reason: 'Required for international import and export activities.',
    merchantTypes: [ELicenseMerchantType.IMPORT_EXPORT],
    activityKeywords: ['import', 'export', 'customs'],
    requiresHazardous: false,
    requiresAlcohol: false,
    requiresFoodPreparation: false,
  },
  {
    code: 'LIC-TRA-001',
    name: 'Public Transport and Logistics License',
    authority: 'Department of Land Transport',
    reason: 'Required for commercial transportation and logistics operations.',
    merchantTypes: [ELicenseMerchantType.TRANSPORT_AND_LOGISTICS],
    activityKeywords: ['transport', 'logistics', 'fleet'],
    requiresHazardous: false,
    requiresAlcohol: false,
    requiresFoodPreparation: false,
  },
  {
    code: 'LIC-CON-001',
    name: 'Construction Contractor License',
    authority: 'Council of Engineers / Relevant Authority',
    reason: 'Required for construction and engineering contract-based activities.',
    merchantTypes: [ELicenseMerchantType.CONSTRUCTION],
    activityKeywords: ['construction', 'contractor', 'engineering'],
    requiresHazardous: false,
    requiresAlcohol: false,
    requiresFoodPreparation: false,
  },
  {
    code: 'LIC-HAZ-001',
    name: 'Hazardous Material Handling Permit',
    authority: 'Department of Industrial Works',
    reason:
      'Required when business operations include hazardous or controlled materials.',
    merchantTypes: Object.values(ELicenseMerchantType),
    requiresHazardous: true,
    activityKeywords: ['hazardous', 'chemical', 'flammable'],
    requiresAlcohol: false,
    requiresFoodPreparation: false,
  },
  {
    code: 'LIC-ENV-001',
    name: 'Environmental Compliance Permit',
    authority: 'Pollution Control Department / Local Authority',
    reason:
      'Required for waste handling, treatment, or high-impact environmental operations.',
    merchantTypes: [ELicenseMerchantType.ENVIRONMENTAL_SERVICE],
    activityKeywords: ['waste', 'recycle', 'treatment', 'pollution'],
    requiresHazardous: false,
    requiresAlcohol: false,
    requiresFoodPreparation: false,
  },
];

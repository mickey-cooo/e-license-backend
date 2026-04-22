export enum CommonStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DELETED = 'deleted',
}

export enum BookingStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  ARCHIVED = 'archived',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  DRAFT = 'draft',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
  APPROVED = 'approved',
}

export enum MerchantType {
  MERCHANT = 'merchant',
  STORE = 'store',
  WAREHOUSE = 'warehouse',
  OTHER = 'other',
}

export enum ELicenseMerchantType {
  FOOD_AND_BEVERAGE = 'food_and_beverage',
  HOTEL_AND_ACCOMMODATION = 'hotel_and_accommodation',
  TOURISM_AND_TRAVEL = 'tourism_and_travel',
  HEALTH_AND_WELLNESS = 'health_and_wellness',
  EDUCATION_AND_TRAINING = 'education_and_training',
  MANUFACTURING = 'manufacturing',
  IMPORT_EXPORT = 'import_export',
  TRANSPORT_AND_LOGISTICS = 'transport_and_logistics',
  CONSTRUCTION = 'construction',
  RETAIL_AND_ECOMMERCE = 'retail_and_ecommerce',
  ENVIRONMENTAL_SERVICE = 'environmental_service',
  DIGITAL_SERVICE = 'digital_service',
  OTHER = 'other',
}

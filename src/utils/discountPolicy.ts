export const DEFAULT_DISCOUNT_PERCENT = 20; // 20% default discount for cancelled slot recovery
export const DEFAULT_COMMISSION_PERCENT = 15; // standard platform commission %
export const DISCOUNT_RECOVERY_COMMISSION_PERCENT = 20; // slightly higher platform commission for recovered bookings (app owner profit)

export function calculateDiscountedPrice(originalPrice: number, discountPercent: number = DEFAULT_DISCOUNT_PERCENT): number {
  return Math.round(originalPrice * (1 - discountPercent / 100));
}

export function calculateArtistNetTake(
  originalPrice: number, 
  discountPercent: number = DEFAULT_DISCOUNT_PERCENT, 
  commissionPercent: number = DISCOUNT_RECOVERY_COMMISSION_PERCENT
): number {
  const discountedPrice = calculateDiscountedPrice(originalPrice, discountPercent);
  return Math.round(discountedPrice * (1 - commissionPercent / 100));
}

import { jalaliToGregorian } from "./shamsi";
import { ClientRequest } from "../types";

export function calculateCancellationFee(request: ClientRequest): { feeApplied: boolean; feeAmount?: number } {
  try {
    const dateParts = request.preferredDate.split("/");
    if (dateParts.length !== 3) {
      return { feeApplied: false };
    }
    const jy = parseInt(dateParts[0], 10);
    const jm = parseInt(dateParts[1], 10);
    const jd = parseInt(dateParts[2], 10);

    const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);

    let hours = 12;
    let minutes = 0;
    if (request.preferredTime) {
      const timeParts = request.preferredTime.split(":");
      if (timeParts.length === 2) {
        hours = parseInt(timeParts[0], 10);
        minutes = parseInt(timeParts[1], 10);
      }
    }

    const requestDate = new Date(gy, gm - 1, gd, hours, minutes);
    const now = new Date();

    const diffMs = requestDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // If the booking is less than 24 hours away (including past bookings), apply fee
    if (diffHours < 24) {
      if (request.price !== undefined) {
        return {
          feeApplied: true,
          feeAmount: Math.round(request.price * 0.3),
        };
      } else {
        return {
          feeApplied: true,
        };
      }
    }

    return { feeApplied: false };
  } catch (error) {
    console.error("Error calculating cancellation fee:", error);
    return { feeApplied: false };
  }
}

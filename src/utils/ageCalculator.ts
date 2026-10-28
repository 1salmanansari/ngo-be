/**
 * Calculate age based on Date of Birth timestamp (milliseconds) or return age from payload
 */
export function calculateAge(dob?: number, fallbackAge?: number): number {
  if (dob && Number(dob) > 0) {
    const birthDate = new Date(Number(dob));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(0, age);
  }
  return fallbackAge ? Number(fallbackAge) : 0;
}

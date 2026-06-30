/** Bangladesh mobile: 01XXXXXXXXX (11 digits) */
export const BD_PHONE_REGEX = /^0[13-9]\d{9}$/;

export const BD_PHONE_PLACEHOLDER = "01XXXXXXXXX";

export function isValidBdPhone(phone: string): boolean {
  return BD_PHONE_REGEX.test(phone.trim());
}

export const BD_PHONE_ERROR_EN = "Valid BD number: 01XXXXXXXXX (11 digits)";
export const BD_PHONE_ERROR_BN = "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (01XXXXXXXXX)";

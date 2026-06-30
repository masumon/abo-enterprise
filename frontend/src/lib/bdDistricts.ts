/** Bangladesh districts for checkout address selection */
export const BD_DISTRICTS = [
  "Dhaka", "Sylhet", "Chattogram", "Rajshahi", "Khulna", "Barishal", "Rangpur", "Mymensingh",
  "Gazipur", "Narayanganj", "Cumilla", "Feni", "Noakhali", "Bogura", "Jessore", "Cox's Bazar",
  "Dinajpur", "Tangail", "Faridpur", "Kushtia", "Pabna", "Sirajganj", "Brahmanbaria", "Habiganj",
  "Moulvibazar", "Sunamganj", "Natore", "Jamalpur", "Sherpur", "Naogaon", "Chapainawabganj",
  "Lalmonirhat", "Nilphamari", "Thakurgaon", "Panchagarh", "Kurigram", "Gaibandha", "Joypurhat",
  "Netrokona", "Kishoreganj", "Manikganj", "Munshiganj", "Narsingdi", "Rajbari", "Madaripur",
  "Gopalganj", "Shariatpur", "Magura", "Jhenaidah", "Chuadanga", "Meherpur", "Narail", "Satkhira",
  "Bagerhat", "Khagrachhari", "Rangamati", "Bandarban", "Patuakhali", "Bhola", "Barguna", "Jhalokati",
  "Pirojpur", "Lakshmipur", "Chandpur",
] as const;

export type BDDistrict = (typeof BD_DISTRICTS)[number];

export const SYLHET_DISTRICTS = new Set(["Sylhet", "Habiganj", "Moulvibazar", "Sunamganj"]);

export function isSylhetArea(district: string): boolean {
  return SYLHET_DISTRICTS.has(district) || district.toLowerCase() === "sylhet";
}

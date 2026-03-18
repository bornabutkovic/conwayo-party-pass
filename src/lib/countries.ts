export interface Country {
  code: string;
  name: string;
  zone: 'HR' | 'EU' | 'INO';
}

export const COUNTRIES: Country[] = [
  { code: 'HR', name: 'Croatia', zone: 'HR' },
  { code: 'AT', name: 'Austria', zone: 'EU' },
  { code: 'BE', name: 'Belgium', zone: 'EU' },
  { code: 'BG', name: 'Bulgaria', zone: 'EU' },
  { code: 'CY', name: 'Cyprus', zone: 'EU' },
  { code: 'CZ', name: 'Czech Republic', zone: 'EU' },
  { code: 'DE', name: 'Germany', zone: 'EU' },
  { code: 'DK', name: 'Denmark', zone: 'EU' },
  { code: 'EE', name: 'Estonia', zone: 'EU' },
  { code: 'ES', name: 'Spain', zone: 'EU' },
  { code: 'FI', name: 'Finland', zone: 'EU' },
  { code: 'FR', name: 'France', zone: 'EU' },
  { code: 'GR', name: 'Greece', zone: 'EU' },
  { code: 'HU', name: 'Hungary', zone: 'EU' },
  { code: 'IE', name: 'Ireland', zone: 'EU' },
  { code: 'IT', name: 'Italy', zone: 'EU' },
  { code: 'LT', name: 'Lithuania', zone: 'EU' },
  { code: 'LU', name: 'Luxembourg', zone: 'EU' },
  { code: 'LV', name: 'Latvia', zone: 'EU' },
  { code: 'MT', name: 'Malta', zone: 'EU' },
  { code: 'NL', name: 'Netherlands', zone: 'EU' },
  { code: 'PL', name: 'Poland', zone: 'EU' },
  { code: 'PT', name: 'Portugal', zone: 'EU' },
  { code: 'RO', name: 'Romania', zone: 'EU' },
  { code: 'SE', name: 'Sweden', zone: 'EU' },
  { code: 'SI', name: 'Slovenia', zone: 'EU' },
  { code: 'SK', name: 'Slovakia', zone: 'EU' },
  { code: 'US', name: 'United States', zone: 'INO' },
  { code: 'GB', name: 'United Kingdom', zone: 'INO' },
  { code: 'CH', name: 'Switzerland', zone: 'INO' },
  { code: 'NO', name: 'Norway', zone: 'INO' },
  { code: 'BA', name: 'Bosnia and Herzegovina', zone: 'INO' },
  { code: 'RS', name: 'Serbia', zone: 'INO' },
  { code: 'ME', name: 'Montenegro', zone: 'INO' },
  { code: 'MK', name: 'North Macedonia', zone: 'INO' },
  { code: 'AL', name: 'Albania', zone: 'INO' },
  { code: 'TR', name: 'Turkey', zone: 'INO' },
  { code: 'RU', name: 'Russia', zone: 'INO' },
  { code: 'CN', name: 'China', zone: 'INO' },
  { code: 'JP', name: 'Japan', zone: 'INO' },
  { code: 'AU', name: 'Australia', zone: 'INO' },
  { code: 'CA', name: 'Canada', zone: 'INO' },
  { code: 'BR', name: 'Brazil', zone: 'INO' },
  { code: 'IN', name: 'India', zone: 'INO' },
  { code: 'ZA', name: 'South Africa', zone: 'INO' },
  { code: 'OTHER', name: 'Other', zone: 'INO' },
];

export function getCountryName(code: string): string {
  return COUNTRIES.find(c => c.code === code)?.name ?? code;
}

export function getCountryZone(code: string): 'HR' | 'EU' | 'INO' {
  return COUNTRIES.find(c => c.code === code)?.zone ?? 'INO';
}

export function getBcPostingZone(countryCode: string, payerType: "individual" | "company"): string {
  const zone = getCountryZone(countryCode);
  if (payerType === "individual") return "INDIVIDUAL";
  if (zone === "HR") return "HR-COMPANY";
  if (zone === "EU") return "EU-COMPANY";
  return "INO-COMPANY";
}

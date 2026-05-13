/** UI patient row — no API / Prisma field names beyond what the screen needs */
export interface PatientViewModel {
  id: string;
  regNo?: string;
  name: string;
  age?: string;
  gender?: string;
  phone: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  occupation?: string;
  refBy?: string;
  createdAt: number;
}

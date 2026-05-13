/** Normalized patient row for dashboard lists (`GET /patients`, recent patients, etc.). */
export type PracticePatientSummary = {
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
};

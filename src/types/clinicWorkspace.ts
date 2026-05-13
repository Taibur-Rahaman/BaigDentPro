export type ClinicActivityLogRow = {
  id: string;
  userId: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string; role: string } | null;
};

export type ClinicActivityLogsResponse = {
  logs: ClinicActivityLogRow[];
  total: number;
  page: number;
  limit: number;
};

export type ClinicSubscriptionClinic = {
  id: string;
  name: string;
  plan: string;
  isActive: boolean;
};

export type ClinicSubscriptionPayload = {
  clinic: ClinicSubscriptionClinic | null;
  subscription: Record<string, unknown> | null;
};

export type ClinicProfile = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo: string | null;
  timezone: string | null;
  region: string;
  plan: string;
  isActive: boolean;
};

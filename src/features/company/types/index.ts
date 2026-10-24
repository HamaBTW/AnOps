export type CompanyRole = "owner" | "admin" | "manager" | "employee";

export type Company = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  currency: string;
  industry?: string;
  logoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CompanyMember = {
  id: string;
  companyId: string;
  userId: string;
  role: CompanyRole;
  status: "active" | "invited";
  userEmail?: string;
  userName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateCompanyInput = {
  name: string;
  currency?: string;
  industry?: string;
};

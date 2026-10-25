import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { activeCompanyCookieOptions, ensureLegacyCompany, getSelectedCompanyId, listMyCompanies, requireCompanyContext, ACTIVE_COMPANY_COOKIE } from "@/server/authz/company";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  await ensureLegacyCompany(session.user.id, session.user.email);
  const companies = await listMyCompanies(session.user.id);
  const selected = await getSelectedCompanyId();
  const activeCompanyId = selected && companies.some((company) => company.id === selected) ? selected : companies.length === 1 ? companies[0].id : null;
  const response = NextResponse.json({ companies, activeCompanyId });
  if (!selected && companies.length === 1) response.cookies.set(ACTIVE_COMPANY_COOKIE, companies[0].id, activeCompanyCookieOptions);
  return response;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  const companyId = body && typeof body === "object" && "companyId" in body && typeof body.companyId === "string" ? body.companyId : "";
  try {
    const context = await requireCompanyContext(session.user.id, session.user.email, companyId, "company.read");
    const response = NextResponse.json({ companyId: context.companyId, role: context.role });
    response.cookies.set(ACTIVE_COMPANY_COOKIE, context.companyId, activeCompanyCookieOptions);
    return response;
  } catch {
    return NextResponse.json({ error: "Company selection is not authorized." }, { status: 403 });
  }
}

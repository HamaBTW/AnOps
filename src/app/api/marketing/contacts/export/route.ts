import { NextResponse } from "next/server";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { assertPermission, PERMISSIONS } from "@/server/security/permissions";
import { listContacts } from "@/server/services/marketing.service";
import { recordAudit } from "@/server/audit/audit.service";
import { isAppError } from "@/shared/lib/errors";

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = String(value);
  // CSV Formula Injection Defense: if the cell starts with =, +, -, @, prefix with a single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  try {
    const ctx = await resolveWorkspace();
    assertPermission(ctx.permissions, PERMISSIONS.MARKETING_EXPORT);

    const url = new URL(request.url);
    const result = await listContacts(ctx, {
      page: "1",
      pageSize: "1000",
      active: url.searchParams.get("active") || "all",
      lifecycleStage: url.searchParams.get("lifecycleStage") || undefined,
    });

    const headers = ["First Name", "Last Name", "Email", "Phone", "Source", "Lifecycle Stage", "Status", "Tags", "Created At"];
    const rows = result.items.map((c) => [
      escapeCsvCell(c.firstName),
      escapeCsvCell(c.lastName),
      escapeCsvCell(c.email || ""),
      escapeCsvCell(c.phone || ""),
      escapeCsvCell(c.source),
      escapeCsvCell(c.lifecycleStage),
      escapeCsvCell(c.isActive ? "Active" : "Inactive"),
      escapeCsvCell(c.tags.map((t) => t.name).join("; ")),
      escapeCsvCell(c.createdAt),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    await recordAudit(ctx.db, {
      companyId: ctx.companyId,
      actorUserId: ctx.userId,
      action: "marketing.contacts.export",
      entityType: "marketing_contact",
      entityId: "bulk",
      requestId: ctx.requestId,
      metadata: { rowCount: rows.length },
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="marketing-contacts-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unable to export contacts." }, { status: 500 });
  }
}

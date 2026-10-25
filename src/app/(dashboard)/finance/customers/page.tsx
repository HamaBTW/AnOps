import { getFinanceService } from "@/server/services/finance.service";

export default async function FinanceCustomersPage() {
  let customers: any[] = [];
  try {
    const service = await getFinanceService();
    customers = await service.listCustomers();
  } catch {
    customers = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">Manage customers for invoicing</p>
      </div>

      <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)]">
                <th className="text-left py-2 pr-4 text-[var(--color-text-secondary)]">Name</th>
                <th className="text-left py-2 pr-4 text-[var(--color-text-secondary)]">Email</th>
                <th className="text-left py-2 pr-4 text-[var(--color-text-secondary)]">Phone</th>
                <th className="text-left py-2 pr-4 text-[var(--color-text-secondary)]">Tax ID</th>
                <th className="text-left py-2 pr-4 text-[var(--color-text-secondary)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-[var(--color-text-secondary)]">No customers yet</td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--color-border-subtle)] last:border-0">
                    <td className="py-2 pr-4 text-[var(--color-text-primary)]">{c.name}</td>
                    <td className="py-2 pr-4 text-[var(--color-text-primary)]">{c.email || "-"}</td>
                    <td className="py-2 pr-4 text-[var(--color-text-primary)]">{c.phone || "-"}</td>
                    <td className="py-2 pr-4 text-[var(--color-text-primary)]">{c.taxId || "-"}</td>
                    <td className="py-2 pr-4 capitalize text-[var(--color-text-primary)]">{c.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

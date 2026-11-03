"use client";
import { ModalPortal } from "@/shared/components/ui/modal-portal";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, selectClass, textareaClass } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";
import {
  createWorkerRentalAction,
  updateWorkerRentalAction,
} from "@/features/hr/actions/worker-rental.actions";
import type { WorkerRentalAgreement } from "@/features/hr/types/worker-rental.types";

export function WorkerRentalModal({
  isOpen,
  onClose,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialData?: WorkerRentalAgreement | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [type, setType] = useState<"rent_in" | "lend_out">(initialData?.type || "rent_in");
  const [workerName, setWorkerName] = useState(initialData?.workerName || "");
  const [workerRole, setWorkerRole] = useState(initialData?.workerRole || "");
  const [workerEmail, setWorkerEmail] = useState(initialData?.workerEmail || "");
  const [workerPhone, setWorkerPhone] = useState(initialData?.workerPhone || "");
  const [workerNationalId, setWorkerNationalId] = useState(initialData?.workerNationalId || "");

  const [partnerCompanyName, setPartnerCompanyName] = useState(initialData?.partnerCompanyName || "");
  const [partnerContactPerson, setPartnerContactPerson] = useState(initialData?.partnerContactPerson || "");
  const [partnerEmail, setPartnerEmail] = useState(initialData?.partnerEmail || "");
  const [partnerPhone, setPartnerPhone] = useState(initialData?.partnerPhone || "");
  const [partnerTaxId, setPartnerTaxId] = useState(initialData?.partnerTaxId || "");

  const [startDate, setStartDate] = useState(initialData?.startDate || new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(initialData?.endDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [rateType, setRateType] = useState(initialData?.rateType || "daily");
  const [unitRate, setUnitRate] = useState(initialData?.unitRate ? String(initialData.unitRate) : "250");
  const [currency, setCurrency] = useState(initialData?.currency || "TND");
  const [estimatedUnits, setEstimatedUnits] = useState(initialData?.estimatedUnits ? String(initialData.estimatedUnits) : "20");

  const [departmentName, setDepartmentName] = useState(initialData?.departmentName || "");
  const [supervisorName, setSupervisorName] = useState(initialData?.supervisorName || "");
  const [projectReference, setProjectReference] = useState(initialData?.projectReference || "");
  const [status, setStatus] = useState(initialData?.status || "active");
  const [notes, setNotes] = useState(initialData?.notes || "");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!workerName.trim()) {
      setError("Worker name is required.");
      return;
    }
    if (!workerRole.trim()) {
      setError("Worker role/specialty is required.");
      return;
    }
    if (!partnerCompanyName.trim()) {
      setError("Partner company name is required.");
      return;
    }

    const payload = {
      type,
      workerName,
      workerRole,
      workerEmail,
      workerPhone,
      workerNationalId,
      partnerCompanyName,
      partnerContactPerson,
      partnerEmail,
      partnerPhone,
      partnerTaxId,
      startDate,
      endDate,
      rateType,
      unitRate: Number(unitRate) || 0,
      currency,
      estimatedUnits: Number(estimatedUnits) || 0,
      departmentName,
      supervisorName,
      projectReference,
      status,
      notes,
    };

    startTransition(async () => {
      let res;
      if (initialData?.id) {
        res = await updateWorkerRentalAction(initialData.id, payload);
      } else {
        res = await createWorkerRentalAction(payload);
      }

      if (res.error) {
        setError(res.error);
        return;
      }

      onClose();
      router.refresh();
    });
  }

  return (
    <ModalPortal><div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-card)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--color-border-subtle)] pb-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {initialData ? `Edit Agreement ${initialData.agreementNumber}` : "New Worker Rental Agreement"}
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Register subcontracted worker loaning, rental periods, billing rates, and supervisory terms.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-lg p-1"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs rounded-[var(--radius-control)] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Agreement Direction */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Rental Direction
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 p-3 rounded-[var(--radius-control)] border cursor-pointer transition-all ${
                  type === "rent_in"
                    ? "border-[var(--color-action-primary)] bg-[var(--color-action-primary)]/10 text-[var(--color-text-primary)]"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/40 text-[var(--color-text-secondary)]"
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value="rent_in"
                  checked={type === "rent_in"}
                  onChange={() => setType("rent_in")}
                  className="text-[var(--color-action-primary)] focus:ring-[var(--color-action-primary)]"
                />
                <div>
                  <div className="text-xs font-bold text-[var(--color-text-primary)]">Rent-In (Incoming Worker)</div>
                  <div className="text-[10px]">Company A rents an external worker from Company B</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-[var(--radius-control)] border cursor-pointer transition-all ${
                  type === "lend_out"
                    ? "border-[var(--color-action-primary)] bg-[var(--color-action-primary)]/10 text-[var(--color-text-primary)]"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/40 text-[var(--color-text-secondary)]"
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value="lend_out"
                  checked={type === "lend_out"}
                  onChange={() => setType("lend_out")}
                  className="text-[var(--color-action-primary)] focus:ring-[var(--color-action-primary)]"
                />
                <div>
                  <div className="text-xs font-bold text-[var(--color-text-primary)]">Loan-Out (Outgoing Lending)</div>
                  <div className="text-[10px]">Company A lends an employee to Company B</div>
                </div>
              </label>
            </div>
          </div>

          {/* Section 1: Worker Profile */}
          <div className="space-y-3 pt-2 border-t border-[var(--color-border-subtle)]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Assigned Worker Profile
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Worker Full Name *"
                placeholder="e.g. Samy Khemir"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
              />
              <TextField
                label="Specialty / Role *"
                placeholder="e.g. Industrial Automation Engineer"
                value={workerRole}
                onChange={(e) => setWorkerRole(e.target.value)}
              />
              <TextField
                label="Worker Email"
                placeholder="samy.khemir@email.com"
                value={workerEmail}
                onChange={(e) => setWorkerEmail(e.target.value)}
              />
              <TextField
                label="Worker Phone"
                placeholder="+216 98 123 456"
                value={workerPhone}
                onChange={(e) => setWorkerPhone(e.target.value)}
              />
              <TextField
                label="National ID / Passport"
                placeholder="CIN: 09876543"
                value={workerNationalId}
                onChange={(e) => setWorkerNationalId(e.target.value)}
              />
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Agreement Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className={selectClass}
                >
                  <option value="active">Active (On Mission)</option>
                  <option value="draft">Draft (Negotiating)</option>
                  <option value="completed">Completed</option>
                  <option value="terminated">Terminated Early</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Partner Company (Company B) */}
          <div className="space-y-3 pt-2 border-t border-[var(--color-border-subtle)]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {type === "rent_in" ? "Lending Company (Company B - Supplier)" : "Host Company (Company B - Client)"}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Company Name *"
                placeholder="e.g. Denshi Tech Solutions"
                value={partnerCompanyName}
                onChange={(e) => setPartnerCompanyName(e.target.value)}
              />
              <TextField
                label="Contact Representative"
                placeholder="e.g. Oussema Issaoui"
                value={partnerContactPerson}
                onChange={(e) => setPartnerContactPerson(e.target.value)}
              />
              <TextField
                label="Partner Email"
                placeholder="billing@denshitech.com"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
              />
              <TextField
                label="Partner Phone / Tax ID"
                placeholder="Matricule Fiscale / Phone"
                value={partnerTaxId}
                onChange={(e) => setPartnerTaxId(e.target.value)}
              />
            </div>
          </div>

          {/* Section 3: Pricing & Duration */}
          <div className="space-y-3 pt-2 border-t border-[var(--color-border-subtle)]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Billing Rates & Mission Duration
            </h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={selectClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">End Date *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={selectClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Billing Rate Unit</label>
                <select
                  value={rateType}
                  onChange={(e) => setRateType(e.target.value as any)}
                  className={selectClass}
                >
                  <option value="daily">Daily Rate (TJM)</option>
                  <option value="hourly">Hourly Rate</option>
                  <option value="monthly">Monthly Fixed</option>
                  <option value="fixed">Fixed Contract Lump Sum</option>
                </select>
              </div>

              <TextField
                label="Unit Rate (Amount) *"
                type="number"
                placeholder="250"
                value={unitRate}
                onChange={(e) => setUnitRate(e.target.value)}
              />
              <TextField
                label="Est. Units (Days/Hours)"
                type="number"
                placeholder="20"
                value={estimatedUnits}
                onChange={(e) => setEstimatedUnits(e.target.value)}
              />
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={selectClass}
                >
                  <option value="TND">TND (Tunisian Dinar)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Internal Assignment */}
          <div className="space-y-3 pt-2 border-t border-[var(--color-border-subtle)]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Internal Assignment in Company
            </h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField
                label="Department / Unit"
                placeholder="e.g. Production Line B"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
              />
              <TextField
                label="Internal Supervisor"
                placeholder="e.g. Karim Ben Salah"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
              />
              <TextField
                label="Project Reference / Code"
                placeholder="e.g. PRJ-AUTO-2026"
                value={projectReference}
                onChange={(e) => setProjectReference(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">Notes & Special Clauses</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Safety equipment provided, confidentiality NDA signed, lunch vouchers included..."
                className={textareaClass}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
            <Button variant="secondary" onClick={onClose} disabled={pending} className="text-xs">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={pending} className="text-xs">
              {pending ? "Saving Agreement..." : initialData ? "Save Changes" : "Create Rental Agreement"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </ModalPortal>
  );
}


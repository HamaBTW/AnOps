import test from "node:test";
import assert from "node:assert/strict";

function resolveCompany({ memberships, activeCompanies, selected }) {
  const eligible = memberships.filter((membership) => membership.status === "active" && activeCompanies.has(membership.companyId));
  if (selected) return eligible.some((membership) => membership.companyId === selected) ? selected : null;
  return eligible.length === 1 ? eligible[0].companyId : null;
}

test("a single active company can initialize the workspace context", () => {
  assert.equal(resolveCompany({ memberships: [{ companyId: "a", status: "active" }], activeCompanies: new Set(["a"]), selected: null }), "a");
});

test("multiple memberships require an explicit selection", () => {
  assert.equal(resolveCompany({ memberships: [{ companyId: "a", status: "active" }, { companyId: "b", status: "active" }], activeCompanies: new Set(["a", "b"]), selected: null }), null);
});

test("an explicit selection can choose either eligible company", () => {
  const input = { memberships: [{ companyId: "a", status: "active" }, { companyId: "b", status: "active" }], activeCompanies: new Set(["a", "b"]) };
  assert.equal(resolveCompany({ ...input, selected: "a" }), "a");
  assert.equal(resolveCompany({ ...input, selected: "b" }), "b");
});

test("suspended memberships and inactive companies are denied", () => {
  assert.equal(resolveCompany({ memberships: [{ companyId: "a", status: "suspended" }], activeCompanies: new Set(["a"]), selected: "a" }), null);
  assert.equal(resolveCompany({ memberships: [{ companyId: "a", status: "active" }], activeCompanies: new Set(), selected: "a" }), null);
});

test("an invalid selection never falls back to another company", () => {
  assert.equal(resolveCompany({ memberships: [{ companyId: "a", status: "active" }, { companyId: "b", status: "active" }], activeCompanies: new Set(["a", "b"]), selected: "not-a-member" }), null);
});

test("client role claims are irrelevant to context selection", () => {
  const selected = resolveCompany({ memberships: [{ companyId: "a", status: "active" }], activeCompanies: new Set(["a"]), selected: "a", requestedRole: "owner" });
  assert.equal(selected, "a");
});

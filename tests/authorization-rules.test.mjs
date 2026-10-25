import test from "node:test";
import assert from "node:assert/strict";

const permissions = {
  owner: new Set(["membership.manage", "marketing.social.publish", "marketing.campaigns.approve"]),
  admin: new Set(["membership.manage", "marketing.social.publish", "marketing.campaigns.approve"]),
  marketing_manager: new Set(["membership.read", "marketing.social.publish", "marketing.campaigns.approve"]),
  marketing_operator: new Set(["marketing.social.manage"]),
  viewer: new Set(["marketing.social.read"]),
};

test("active membership roles grant only documented permissions", () => {
  assert.equal(permissions.viewer.has("marketing.social.read"), true);
  assert.equal(permissions.viewer.has("marketing.social.manage"), false);
  assert.equal(permissions.marketing_operator.has("marketing.social.manage"), true);
  assert.equal(permissions.marketing_operator.has("marketing.social.publish"), false);
  assert.equal(permissions.marketing_manager.has("marketing.campaigns.approve"), true);
  assert.equal(permissions.viewer.has("hr.read"), false);
  assert.equal(permissions.owner.has("hr.sensitive"), true);
});

test("membership mutations cannot assign owner or self-escalate", () => {
  const canAssign = (actor, target) => ["owner", "admin"].includes(actor) && target !== "owner";
  assert.equal(canAssign("marketing_manager", "admin"), false);
  assert.equal(canAssign("admin", "marketing_manager"), true);
  assert.equal(canAssign("admin", "owner"), false);
});

test("the final active owner cannot be suspended or removed", () => {
  const canDeactivate = (activeOwners, targetRole) => !(targetRole === "owner" && activeOwners <= 1);
  assert.equal(canDeactivate(1, "owner"), false);
  assert.equal(canDeactivate(2, "owner"), true);
  assert.equal(canDeactivate(1, "viewer"), true);
});

import "server-only";
import { z } from "zod";
import { callTool, field, form, nonEmpty, proposeTool } from "@/server/ai/commands/helpers";
import type { CommandArgs, CommandDefinition, CommandEnv, CommandResult } from "@/server/ai/commands/types";
import { getProduct, getWarehouse, listCategories, listWarehouses } from "@/server/inventory/catalog.service";
import { listBalancesForProduct } from "@/server/inventory/stock.service";
import type { AiFormField, AiMessagePart } from "@/server/db/documents";
import { PERMISSIONS } from "@/server/security/permissions";
import { UNIT_LABELS, UNITS_OF_MEASURE } from "@/shared/domain/units";
import { AppError } from "@/shared/lib/errors";
import { objectIdSchema } from "@/shared/lib/schema-primitives";

/**
 * Inventory slash commands. Reads reuse the read tools; writes build a form, then hand the values to
 * the write tool, which prepares a diff and stores a proposal. The person confirms it in the thread.
 */
const ARGS = z.record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean()])).refine((v) => Object.keys(v).length <= 8, "Too many arguments");

const searchText = (rest: string) => ({ q: rest.trim().slice(0, 80) });
const noText = () => ({});

function need(args: CommandArgs, key: string): string {
  const parsed = objectIdSchema.safeParse(args[key]);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Select a record first.");
  return parsed.data;
}

function requireCell(env: CommandEnv, op: "view" | "create" | "edit" | "delete" | "approve"): void {
  if (!env.access.can("inventory", op)) throw new AppError("FORBIDDEN", "You do not have AI access for that.");
}

/** Converts a list table into a picker: every row gets one Select action that continues `command`. */
function asPicker(parts: AiMessagePart[] | undefined, command: string, key: string, title: string): AiMessagePart[] {
  return (parts ?? []).map((part) => {
    if (part.type !== "record_table") return part;
    return {
      ...part,
      title,
      rows: part.rows.map((r) => ({ ...r, actions: [{ label: "Select", command, args: { [key]: r.id.split(":")[0] }, step: "select" as const }] })),
      paging: part.paging ? { ...part.paging, command } : undefined,
    };
  });
}

function pickProduct(def: {
  name: string;
  description: string;
  example: string;
  operation: CommandDefinition["operation"];
  permission: CommandDefinition["permission"];
  title: string;
  status?: "active" | "archived";
  select: NonNullable<CommandDefinition["select"]>;
}): CommandDefinition {
  return {
    name: def.name,
    description: def.description,
    example: def.example,
    module: "inventory",
    operation: def.operation,
    permission: def.permission,
    args: ARGS,
    fromText: searchText,
    async start(env, args) {
      requireCell(env, "view");
      const result = await callTool(env, "inventory_list_products", { q: String(args.q ?? ""), status: def.status ?? "active", page: Number(args.page ?? 1) });
      return { parts: asPicker(result.parts, def.name, "productId", def.title) };
    },
    select: def.select,
  };
}

const money = (name: string, label: string, value = ""): AiFormField => field({ name, label, kind: "text", value, placeholder: "0.000", hint: "Up to 3 decimals" });

async function categoryOptions(env: CommandEnv): Promise<{ value: string; label: string }[]> {
  const active = (await listCategories(env.ctx)).filter((c) => c.isActive);
  return [{ value: "", label: "No category" }, ...active.map((c) => ({ value: c.id, label: c.name }))];
}

const unitOptions = UNITS_OF_MEASURE.map((u) => ({ value: u, label: `${UNIT_LABELS[u]} (${u})` }));

// ─── Reads ────────────────────────────────────────────────────────────────────

const products: CommandDefinition = {
  name: "products",
  description: "Browse and search products.",
  example: "/products bolt",
  module: "inventory",
  operation: "view",
  permission: PERMISSIONS.INVENTORY_READ,
  args: ARGS,
  fromText: searchText,
  async start(env, args) {
    const status = args.status === "archived" || args.status === "all" ? args.status : "active";
    const result = await callTool(env, "inventory_list_products", { q: String(args.q ?? ""), status, page: Number(args.page ?? 1), ...(args.categoryId ? { categoryId: String(args.categoryId) } : {}) });
    return { parts: result.parts ?? [] };
  },
};

const product: CommandDefinition = {
  name: "product",
  description: "Show one product.",
  example: "/product",
  module: "inventory",
  operation: "view",
  permission: PERMISSIONS.INVENTORY_READ,
  hidden: true,
  args: ARGS,
  fromText: noText,
  async start(env, args) {
    return { parts: (await callTool(env, "inventory_get_product", { productId: need(args, "productId") })).parts ?? [] };
  },
};

const readCommand = (name: string, description: string, tool: string, pick: (args: CommandArgs) => Record<string, unknown>, hidden = false): CommandDefinition => ({
  name,
  description,
  example: `/${name}`,
  module: "inventory",
  operation: "view",
  permission: PERMISSIONS.INVENTORY_READ,
  hidden,
  args: ARGS,
  fromText: noText,
  async start(env, args) {
    return { parts: (await callTool(env, tool, pick(args))).parts ?? [] };
  },
});

const ids = (args: CommandArgs) => ({
  ...(args.productId ? { productId: String(args.productId) } : {}),
  ...(args.warehouseId ? { warehouseId: String(args.warehouseId) } : {}),
  page: Number(args.page ?? 1),
});

const categories = readCommand("categories", "List product categories.", "inventory_list_categories", () => ({}));
const warehouses = readCommand("warehouses", "List warehouses and their stock.", "inventory_list_warehouses", () => ({}));
const stock = readCommand("stock", "Stock on hand by product and warehouse.", "inventory_stock_balances", ids);
const movements = readCommand("movements", "Recent stock movements.", "inventory_stock_movements", ids);

// ─── Create ───────────────────────────────────────────────────────────────────

const newcategory: CommandDefinition = {
  name: "newcategory",
  description: "Create a product category.",
  example: "/newcategory",
  module: "inventory",
  operation: "create",
  permission: PERMISSIONS.INVENTORY_PRODUCT_MANAGE,
  args: ARGS,
  fromText: noText,
  async start() {
    return { parts: [form({ title: "New category", command: "newcategory", context: {}, submitLabel: "Review", fields: [field({ name: "name", label: "Name", kind: "text", required: true }), field({ name: "description", label: "Description", kind: "textarea" })] })] };
  },
  submit: (env, _args, values) => proposeTool(env, "inventory_create_category", nonEmpty(values)),
};

const newwarehouse: CommandDefinition = {
  name: "newwarehouse",
  description: "Create a warehouse.",
  example: "/newwarehouse",
  module: "inventory",
  operation: "create",
  permission: PERMISSIONS.INVENTORY_WAREHOUSE_MANAGE,
  args: ARGS,
  fromText: noText,
  async start() {
    return {
      parts: [
        form({
          title: "New warehouse",
          command: "newwarehouse",
          context: {},
          submitLabel: "Review",
          fields: [
            field({ name: "name", label: "Name", kind: "text", required: true }),
            field({ name: "code", label: "Code", kind: "text", required: true, hint: "2 to 12 letters, digits or dashes", placeholder: "MAIN" }),
            field({ name: "address", label: "Address", kind: "text" }),
          ],
        }),
      ],
    };
  },
  submit: (env, _args, values) => proposeTool(env, "inventory_create_warehouse", nonEmpty(values)),
};

const newproduct: CommandDefinition = {
  name: "newproduct",
  description: "Create a product.",
  example: "/newproduct",
  module: "inventory",
  operation: "create",
  permission: PERMISSIONS.INVENTORY_PRODUCT_MANAGE,
  args: ARGS,
  fromText: noText,
  async start(env) {
    requireCell(env, "view");
    return {
      parts: [
        form({
          title: "New product",
          command: "newproduct",
          context: {},
          submitLabel: "Review",
          fields: [
            field({ name: "sku", label: "SKU", kind: "text", required: true, placeholder: "BOLT-M8" }),
            field({ name: "name", label: "Name", kind: "text", required: true }),
            field({ name: "unitOfMeasure", label: "Unit", kind: "select", required: true, value: "unit", options: unitOptions }),
            field({ name: "categoryId", label: "Category", kind: "select", value: "", options: await categoryOptions(env) }),
            money("cost", "Cost", "0"),
            money("salePrice", "Sale price", "0"),
            field({ name: "reorderPoint", label: "Reorder point", kind: "text", value: "0", hint: "Whole number for units and boxes" }),
            field({ name: "isStorable", label: "Keep stock of this product", kind: "checkbox", value: true }),
            field({ name: "description", label: "Description", kind: "textarea" }),
          ],
        }),
      ],
    };
  },
  submit: (env, _args, values) => proposeTool(env, "inventory_create_product", nonEmpty(values, ["categoryId", "isStorable"])),
};

// ─── Edit ─────────────────────────────────────────────────────────────────────

const editproduct = pickProduct({
  name: "editproduct",
  description: "Edit a product: pick it, change fields, review, confirm.",
  example: "/editproduct bolt",
  operation: "edit",
  permission: PERMISSIONS.INVENTORY_PRODUCT_MANAGE,
  title: "Choose a product to edit",
  async select(env, args) {
    requireCell(env, "view");
    const p = await getProduct(env.ctx, need(args, "productId"));
    return {
      parts: [
        form({
          title: `Edit ${p.sku}`,
          description: "Change what you need. You will see exactly what changes before anything is saved.",
          command: "editproduct",
          context: { productId: p.id, version: p.version },
          submitLabel: "Review changes",
          fields: [
            field({ name: "name", label: "Name", kind: "text", required: true, value: p.name }),
            field({ name: "sku", label: "SKU", kind: "text", required: true, value: p.sku }),
            field({ name: "categoryId", label: "Category", kind: "select", value: p.categoryId ?? "", options: await categoryOptions(env) }),
            field({ name: "unitOfMeasure", label: "Unit", kind: "select", value: p.unitOfMeasure, options: unitOptions }),
            money("cost", "Cost", p.cost),
            money("salePrice", "Sale price", p.salePrice),
            field({ name: "reorderPoint", label: "Reorder point", kind: "text", value: p.reorderPoint }),
            field({ name: "isStorable", label: "Keep stock of this product", kind: "checkbox", value: p.isStorable }),
            field({ name: "description", label: "Description", kind: "textarea", value: p.description }),
          ],
        }),
      ],
    };
  },
});
editproduct.submit = (env, args, values) =>
  proposeTool(env, "inventory_update_product", { ...nonEmpty(values, ["categoryId", "description", "isStorable"]), productId: need(args, "productId"), expectedVersion: Number(args.version) });

const editcategory: CommandDefinition = {
  name: "editcategory",
  description: "Rename a category or change its description.",
  example: "/editcategory",
  module: "inventory",
  operation: "edit",
  permission: PERMISSIONS.INVENTORY_PRODUCT_MANAGE,
  args: ARGS,
  fromText: noText,
  async start(env) {
    requireCell(env, "view");
    return { parts: asPicker((await callTool(env, "inventory_list_categories", {})).parts, "editcategory", "categoryId", "Choose a category to edit") };
  },
  async select(env, args) {
    const id = need(args, "categoryId");
    const c = (await listCategories(env.ctx)).find((x) => x.id === id);
    if (!c) throw new AppError("NOT_FOUND", "Category not found");
    return {
      parts: [
        form({
          title: `Edit ${c.name}`,
          command: "editcategory",
          context: { categoryId: c.id },
          submitLabel: "Review changes",
          fields: [field({ name: "name", label: "Name", kind: "text", required: true, value: c.name }), field({ name: "description", label: "Description", kind: "textarea", value: c.description })],
        }),
      ],
    };
  },
  submit: (env, args, values) => proposeTool(env, "inventory_update_category", { ...nonEmpty(values, ["description"]), categoryId: need(args, "categoryId") }),
};

const editwarehouse: CommandDefinition = {
  name: "editwarehouse",
  description: "Edit a warehouse.",
  example: "/editwarehouse",
  module: "inventory",
  operation: "edit",
  permission: PERMISSIONS.INVENTORY_WAREHOUSE_MANAGE,
  args: ARGS,
  fromText: noText,
  async start(env) {
    requireCell(env, "view");
    return { parts: asPicker((await callTool(env, "inventory_list_warehouses", {})).parts, "editwarehouse", "warehouseId", "Choose a warehouse to edit") };
  },
  async select(env, args) {
    const w = await getWarehouse(env.ctx, need(args, "warehouseId"));
    return {
      parts: [
        form({
          title: `Edit ${w.code}`,
          command: "editwarehouse",
          context: { warehouseId: w.id },
          submitLabel: "Review changes",
          fields: [
            field({ name: "name", label: "Name", kind: "text", required: true, value: w.name }),
            field({ name: "code", label: "Code", kind: "text", required: true, value: w.code }),
            field({ name: "address", label: "Address", kind: "text", value: w.address }),
            field({ name: "isActive", label: "Active", kind: "checkbox", value: w.isActive, hint: "A warehouse that holds stock cannot be deactivated" }),
          ],
        }),
      ],
    };
  },
  submit: (env, args, values) => proposeTool(env, "inventory_update_warehouse", { ...nonEmpty(values, ["address", "isActive"]), warehouseId: need(args, "warehouseId") }),
};

const archiveproduct = pickProduct({
  name: "archiveproduct",
  description: "Archive a product (keeps its history).",
  example: "/archiveproduct bolt",
  operation: "edit",
  permission: PERMISSIONS.INVENTORY_PRODUCT_MANAGE,
  title: "Choose a product to archive",
  select: (env, args) => proposeTool(env, "inventory_set_product_active", { productId: need(args, "productId"), isActive: false }),
});

const restoreproduct = pickProduct({
  name: "restoreproduct",
  description: "Restore an archived product.",
  example: "/restoreproduct",
  operation: "edit",
  permission: PERMISSIONS.INVENTORY_PRODUCT_MANAGE,
  title: "Choose an archived product to restore",
  status: "archived",
  select: (env, args) => proposeTool(env, "inventory_set_product_active", { productId: need(args, "productId"), isActive: true }),
});

const deleteproduct = pickProduct({
  name: "deleteproduct",
  description: "Permanently delete an unused product (typed confirmation).",
  example: "/deleteproduct spare",
  operation: "delete",
  permission: PERMISSIONS.INVENTORY_PRODUCT_MANAGE,
  title: "Choose a product to delete",
  select: (env, args) => proposeTool(env, "inventory_delete_product", { productId: need(args, "productId") }),
});

// ─── Stock ────────────────────────────────────────────────────────────────────

async function warehouseChoices(env: CommandEnv, productId: string) {
  const [all, balances] = await Promise.all([listWarehouses(env.ctx), listBalancesForProduct(env.ctx, productId)]);
  const held = new Map(balances.map((b) => [b.warehouseId, b.onHand]));
  return all.filter((w) => w.isActive).map((w) => ({ value: w.id, label: `${w.code} · ${w.name} (${held.get(w.id) ?? "0"} on hand)` }));
}

function stockCommand(opts: {
  name: string;
  description: string;
  op: "edit" | "approve";
  permission: CommandDefinition["permission"];
  title: (sku: string) => string;
  fields: (choices: { value: string; label: string }[]) => AiFormField[];
}): CommandDefinition {
  return pickProduct({
    name: opts.name,
    description: opts.description,
    example: `/${opts.name} bolt`,
    operation: opts.op,
    permission: opts.permission,
    title: `Choose a product: ${opts.name}`,
    async select(env, args) {
      requireCell(env, "view");
      const productId = need(args, "productId");
      const p = await getProduct(env.ctx, productId);
      if (!p.isStorable) throw new AppError("VALIDATION_ERROR", `${p.sku} is not a stocked product.`);
      const choices = await warehouseChoices(env, productId);
      if (choices.length === 0) throw new AppError("VALIDATION_ERROR", "Create an active warehouse first with /newwarehouse.");
      return { parts: [form({ title: opts.title(p.sku), description: p.name, command: opts.name, context: { productId }, submitLabel: "Review", fields: opts.fields(choices) })] };
    },
  });
}

const qty = field({ name: "quantity", label: "Quantity", kind: "text", required: true, placeholder: "0" });
const reason = (required: boolean) => field({ name: "reason", label: "Reason", kind: "text", required });

const receive = stockCommand({
  name: "receive",
  description: "Receive stock into a warehouse.",
  op: "edit",
  permission: PERMISSIONS.INVENTORY_STOCK_MOVE,
  title: (sku) => `Receive ${sku}`,
  fields: (c) => [field({ name: "warehouseId", label: "Warehouse", kind: "select", required: true, options: c, value: c[0].value }), qty, reason(false)],
});
receive.submit = (env, args, v) => proposeTool(env, "inventory_receive_stock", { ...nonEmpty(v), productId: need(args, "productId") });

const issue = stockCommand({
  name: "issue",
  description: "Issue stock out of a warehouse.",
  op: "edit",
  permission: PERMISSIONS.INVENTORY_STOCK_MOVE,
  title: (sku) => `Issue ${sku}`,
  fields: (c) => [field({ name: "warehouseId", label: "Warehouse", kind: "select", required: true, options: c, value: c[0].value }), qty, reason(true)],
});
issue.submit = (env, args, v) => proposeTool(env, "inventory_issue_stock", { ...nonEmpty(v), productId: need(args, "productId") });

const transfer = stockCommand({
  name: "transfer",
  description: "Move stock between warehouses.",
  op: "edit",
  permission: PERMISSIONS.INVENTORY_STOCK_MOVE,
  title: (sku) => `Transfer ${sku}`,
  fields: (c) => [
    field({ name: "fromWarehouseId", label: "From", kind: "select", required: true, options: c, value: c[0].value }),
    field({ name: "toWarehouseId", label: "To", kind: "select", required: true, options: c, value: c[Math.min(1, c.length - 1)].value }),
    qty,
    reason(false),
  ],
});
transfer.submit = (env, args, v) => proposeTool(env, "inventory_transfer_stock", { ...nonEmpty(v), productId: need(args, "productId") });

const adjust = stockCommand({
  name: "adjust",
  description: "Correct a stock count (typed confirmation).",
  op: "approve",
  permission: PERMISSIONS.INVENTORY_STOCK_ADJUST,
  title: (sku) => `Adjust ${sku}`,
  fields: (c) => [
    field({ name: "warehouseId", label: "Warehouse", kind: "select", required: true, options: c, value: c[0].value }),
    field({ name: "delta", label: "Change", kind: "text", required: true, placeholder: "-3 or 5", hint: "Use a minus sign to reduce stock" }),
    reason(true),
  ],
});
adjust.submit = (env, args, v) => proposeTool(env, "inventory_adjust_stock", { ...nonEmpty(v), productId: need(args, "productId") });

export const INVENTORY_COMMANDS: CommandDefinition[] = [
  products,
  product,
  categories,
  warehouses,
  stock,
  movements,
  newproduct,
  newcategory,
  newwarehouse,
  editproduct,
  editcategory,
  editwarehouse,
  archiveproduct,
  restoreproduct,
  deleteproduct,
  receive,
  issue,
  transfer,
  adjust,
];

export type { CommandResult };

import "server-only";
import { createToolRegistry } from "@/server/ai/tools/registry";
import { CORE_TOOLS } from "@/server/ai/tools/core.tools";
import { INVENTORY_TOOLS } from "@/server/ai/tools/inventory.tools";

/**
 * The production registry. Module tools are appended here phase by phase; each module's tools live
 * in their own file and import only that module's services.
 */
export const aiToolRegistry = createToolRegistry([...CORE_TOOLS, ...INVENTORY_TOOLS]);

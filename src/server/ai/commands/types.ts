import "server-only";
import type { ZodType } from "zod";
import type { ObjectId } from "mongodb";
import type { AiAccess } from "@/server/ai/access/access.service";
import type { ToolRegistry } from "@/server/ai/tools/registry";
import type { AiMessagePart } from "@/server/db/documents";
import type { Permission } from "@/server/security/permissions";
import type { WorkspaceContext } from "@/server/tenancy/workspace";
import type { AiModuleKey, AiOperation } from "@/shared/domain/ai";

/**
 * Slash commands are deterministic: they skip the model and drive the same tools through guided
 * steps (pick a record, fill a form, confirm). The runner re-resolves the member's live access before
 * every step, and every step's arguments are validated on the server whatever the client sent.
 */
export type CommandArgs = Record<string, string | number | boolean>;

export type CommandEnv = {
  /** Built from the LIVE role and permissions, never the ones from the start of the request. */
  ctx: WorkspaceContext;
  access: AiAccess;
  registry: ToolRegistry;
  conversationId: ObjectId | null;
};

export type CommandResult = { parts: AiMessagePart[]; text?: string };

export type CommandDefinition = {
  /** Without the slash, lower case: "products". */
  name: string;
  description: string;
  example: string;
  module: AiModuleKey | "core";
  operation: AiOperation;
  /** The exact permission the underlying service asserts. null for core commands. */
  permission: Permission | null;
  /** Reached only from a row or card action, so not listed in the palette. */
  hidden?: boolean;
  /** Validates the args that arrive with any step (start args, the selected id, the form context). */
  args: ZodType<CommandArgs>;
  /** Turns "/products bolt" into args. */
  fromText: (rest: string) => Record<string, unknown>;
  start: (env: CommandEnv, args: CommandArgs) => Promise<CommandResult>;
  select?: (env: CommandEnv, args: CommandArgs) => Promise<CommandResult>;
  submit?: (env: CommandEnv, args: CommandArgs, values: Record<string, string | number | boolean>) => Promise<CommandResult>;
};

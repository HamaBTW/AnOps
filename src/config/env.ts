import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Email / SMTP (optional; when unset, dev falls back to console logging)
  EMAIL_SERVER_HOST: z
    .string()
    .min(1)
    .refine(
      (value) => !value.includes("://"),
      "EMAIL_SERVER_HOST must be a hostname (e.g. smtp.gmail.com), not a URL"
    )
    .optional(),
  EMAIL_SERVER_PORT: z.coerce.number().int().positive().optional(),
  EMAIL_SERVER_SECURE: booleanString.optional(),
  EMAIL_SERVER_USER: z.string().optional(),
  EMAIL_SERVER_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  EMAIL_LOGO_URL: z.string().url().optional(),

  // Marketing. All optional: a missing value makes only its integration unavailable, never the app.
  // Formats are validated where each integration is used (server/marketing/config.ts).
  FACEBOOK_APP_ID: z.string().min(1).optional(),
  FACEBOOK_APP_SECRET: z.string().min(1).optional(),
  SOCIAL_TOKEN_ENCRYPTION_KEY: z.string().min(1).optional(),
  MARKETING_WEBHOOK_SECRET: z.string().min(1).optional(),
  MARKETING_WORKER_SECRET: z.string().min(1).optional(),

});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse({
    MONGODB_URI: process.env.MONGODB_URI,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
    EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
    EMAIL_SERVER_SECURE: process.env.EMAIL_SERVER_SECURE,
    EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_LOGO_URL: process.env.EMAIL_LOGO_URL,
    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
    SOCIAL_TOKEN_ENCRYPTION_KEY: process.env.SOCIAL_TOKEN_ENCRYPTION_KEY,
    MARKETING_WEBHOOK_SECRET: process.env.MARKETING_WEBHOOK_SECRET,
    MARKETING_WORKER_SECRET: process.env.MARKETING_WORKER_SECRET,
  });

  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const env = loadEnv();

export function getAppUrl(): string {
  return env.NEXTAUTH_URL ?? "http://localhost:3000";
}

export function isEmailConfigured(): boolean {
  return Boolean(env.EMAIL_SERVER_HOST && env.EMAIL_FROM);
}

/**
 * Brevo and marketing-delivery settings. Validated lazily on first use, not at startup, so a malformed
 * value disables only the delivery integration and never stops sign-in or unrelated features.
 * Errors name variables and rules, never values.
 */
const brevoEnvSchema = z.object({
  BREVO_API_key: z.string().min(1).optional(),
  BREVO_SENDER_EMAIL: z.string().email().max(254).optional(),
  BREVO_SENDER_NAME: z.string().min(1).max(80).optional(),
  BREVO_SMS_SENDER: z.string().max(15).optional(),
  BREVO_WEBHOOK_TOKEN: z.string().min(1).optional(),
  BREVO_EMAIL_MARKETING_APPROVED: booleanString.optional(),
  MARKETING_SEND_ALLOWLIST: z.string().max(2000).optional(),
});

export type BrevoEnv = z.infer<typeof brevoEnvSchema>;

let brevoEnvCache: { value: BrevoEnv; issues: string[] } | null = null;

export function getBrevoEnv(): { value: BrevoEnv; issues: string[] } {
  if (brevoEnvCache) return brevoEnvCache;
  const parsed = brevoEnvSchema.safeParse({
    BREVO_API_key: process.env.BREVO_API_key,
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
    BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME,
    BREVO_SMS_SENDER: process.env.BREVO_SMS_SENDER,
    BREVO_WEBHOOK_TOKEN: process.env.BREVO_WEBHOOK_TOKEN,
    BREVO_EMAIL_MARKETING_APPROVED: process.env.BREVO_EMAIL_MARKETING_APPROVED,
    MARKETING_SEND_ALLOWLIST: process.env.MARKETING_SEND_ALLOWLIST,
  });
  brevoEnvCache = parsed.success
    ? { value: parsed.data, issues: [] }
    : {
        value: {},
        issues: parsed.error.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`),
      };
  return brevoEnvCache;
}

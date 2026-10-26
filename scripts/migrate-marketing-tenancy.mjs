/**
 * Migration script for legacy marketing records and shadow companies.
 *
 * Usage:
 *   node scripts/migrate-marketing-tenancy.mjs          # dry run: prints planned changes
 *   node scripts/migrate-marketing-tenancy.mjs --apply  # applies the migration idempotently
 *
 * Invariants:
 *   - Idempotent: safe to run multiple times.
 *   - Non-destructive: preserves original records and historical consent.
 *   - Detects canonical owner for legacy shadow companies (e.g. by createdByUserId).
 *   - Maps legacy companyIds in marketing collections to canonical companyId.
 *   - De-duplicates contacts on (companyId, normalizedEmail) and (companyId, normalizedPhone).
 *   - Reconciles tags, tag assignments, consents, audiences, templates, campaigns.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient, ObjectId } from "mongodb";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");

function loadUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const envPath = path.join(SCRIPT_DIR, "..", ".env");
  if (fs.existsSync(envPath)) {
    const line = fs.readFileSync(envPath, "utf8").split("\n").find((l) => l.startsWith("MONGODB_URI="));
    if (line) return line.slice("MONGODB_URI=".length).replace(/^"|"$/g, "");
  }
  return "mongodb://localhost:27017/test";
}

const MARKETING_COLLECTIONS = [
  "marketing_contacts",
  "marketing_tags",
  "marketing_tag_assignments",
  "marketing_consents",
  "marketing_audiences",
  "marketing_audience_members",
  "marketing_templates",
  "marketing_campaigns",
  "marketing_campaign_deliveries",
  "marketing_campaign_events",
  "marketing_social_accounts",
  "marketing_social_posts",
  "marketing_social_publish_attempts",
  "marketing_ai_generations",
];

export async function runMarketingMigration(db, options = { apply: false }) {
  const report = [];
  const log = (step, detail) => {
    report.push({ step, detail });
    if (!options.silent) {
      console.log(`[${options.apply ? "apply" : "dry-run"}] ${step}: ${detail}`);
    }
  };

  // 1. Identify legacy shadow companies (created by ensureLegacyCompany: have createdByUserId but no ownerId, or name ends in 's workspace)
  const allCompanies = await db.collection("companies").find({}).toArray();
  const canonicalCompanies = allCompanies.filter((c) => c.ownerId !== undefined);
  const shadowCompanies = allCompanies.filter(
    (c) => c.ownerId === undefined && (c.createdByUserId !== undefined || c.name.includes("'s workspace"))
  );

  const shadowToCanonicalMap = new Map();

  for (const shadow of shadowCompanies) {
    const creatorId = shadow.createdByUserId;
    if (!creatorId) {
      log("orphan-shadow", `Company ${shadow._id} (${shadow.name}) has no createdByUserId; skipping`);
      continue;
    }
    // Find canonical company owned by creator or where creator is owner in company_members
    const creatorObjId = ObjectId.isValid(creatorId) ? new ObjectId(creatorId) : null;
    const canonical =
      canonicalCompanies.find((c) => creatorObjId && c.ownerId?.equals(creatorObjId)) ||
      (await db.collection("company_members").findOne({ userId: creatorObjId, role: "owner", status: "active" })
        .then((m) => (m ? canonicalCompanies.find((c) => c._id.equals(m.companyId)) : null)));

    if (canonical) {
      shadowToCanonicalMap.set(shadow._id.toHexString(), canonical._id);
      log("map-company", `Shadow company "${shadow.name}" (${shadow._id}) -> Canonical "${canonical.name}" (${canonical._id})`);
    } else {
      log("unmapped-shadow", `No canonical company found for creator ${creatorId} of shadow company ${shadow._id}`);
    }
  }

  // 2. Migrate marketing collections from shadow companies to canonical companies
  for (const colName of MARKETING_COLLECTIONS) {
    const exists = (await db.listCollections({ name: colName }).toArray()).length > 0;
    if (!exists) continue;

    for (const [shadowIdStr, canonicalObjId] of shadowToCanonicalMap.entries()) {
      const shadowObjId = new ObjectId(shadowIdStr);
      const count = await db.collection(colName).countDocuments({ companyId: shadowObjId });
      if (count === 0) continue;

      if (colName === "marketing_contacts") {
        // Handle deduplication carefully
        const shadowContacts = await db.collection("marketing_contacts").find({ companyId: shadowObjId }).toArray();
        for (const contact of shadowContacts) {
          const email = contact.normalizedEmail || (contact.email ? contact.email.trim().toLowerCase() : undefined);
          const phone = contact.normalizedPhone || (contact.phone ? contact.phone.replace(/[^\d+]/g, "") : undefined);

          const duplicateQuery = {
            companyId: canonicalObjId,
            $or: [
              ...(email ? [{ normalizedEmail: email }] : []),
              ...(phone ? [{ normalizedPhone: phone }] : []),
            ],
          };

          const existingInCanonical = duplicateQuery.$or.length > 0
            ? await db.collection("marketing_contacts").findOne(duplicateQuery)
            : null;

          if (existingInCanonical) {
            log(
              "duplicate-contact",
              `Contact ${contact._id} (${contact.firstName} ${contact.lastName}, ${email || phone}) in shadow ${shadowIdStr} duplicates ${existingInCanonical._id} in canonical ${canonicalObjId}`
            );
            // Remap references from shadow contact to existing canonical contact
            for (const childCol of ["marketing_tag_assignments", "marketing_consents", "marketing_audience_members", "marketing_campaign_deliveries"]) {
              const childExists = (await db.listCollections({ name: childCol }).toArray()).length > 0;
              if (!childExists) continue;
              const refCount = await db.collection(childCol).countDocuments({ companyId: shadowObjId, contactId: contact._id });
              if (refCount > 0) {
                log("remap-child", `${childCol}: remap ${refCount} docs from contact ${contact._id} to ${existingInCanonical._id}`);
                if (options.apply) {
                  await db.collection(childCol).updateMany(
                    { companyId: shadowObjId, contactId: contact._id },
                    { $set: { companyId: canonicalObjId, contactId: existingInCanonical._id } }
                  );
                }
              }
            }
          } else {
            log(
              "migrate-contact",
              `Moving contact ${contact._id} (${contact.firstName} ${contact.lastName}) to canonical company ${canonicalObjId}`
            );
            if (options.apply) {
              await db.collection("marketing_contacts").updateOne(
                { _id: contact._id },
                {
                  $set: {
                    companyId: canonicalObjId,
                    normalizedEmail: email,
                    normalizedPhone: phone,
                    updatedAt: new Date(),
                  },
                }
              );
            }
          }
        }
      } else {
        // Direct companyId reassignment for non-contact collections
        log("reassign-company", `${colName}: ${count} document(s) from shadow ${shadowIdStr} -> canonical ${canonicalObjId}`);
        if (options.apply) {
          await db.collection(colName).updateMany(
            { companyId: shadowObjId },
            { $set: { companyId: canonicalObjId, updatedAt: new Date() } }
          );
        }
      }
    }
  }

  // 3. Mark shadow companies as archived or migrated
  for (const shadowIdStr of shadowToCanonicalMap.keys()) {
    log("mark-shadow", `Mark shadow company ${shadowIdStr} as status: "archived"`);
    if (options.apply) {
      await db.collection("companies").updateOne(
        { _id: new ObjectId(shadowIdStr) },
        { $set: { status: "archived", updatedAt: new Date(), isShadowWorkspace: true } }
      );
    }
  }

  return report;
}

async function main() {
  const uri = loadUri();
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db();
  console.log(`Database: ${db.databaseName}  mode: ${APPLY ? "APPLY" : "DRY RUN (no writes)"}`);

  const report = await runMarketingMigration(db, { apply: APPLY });
  console.log(`\n${report.length} planned change(s). ${APPLY ? "Applied." : "Dry run: nothing was written. Re-run with --apply to migrate."}`);
  await client.close();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}

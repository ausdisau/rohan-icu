/**
 * Zod schema + continuity lint for Rohan's emergency-kit inventory catalog.
 */
import { access } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import type { ContinuityFinding } from "./continuity";

export const emergencyKitAuditFlagSchema = z.enum([
  "ok",
  "needs-crop",
  "text-heavy",
  "sensitive-meds",
]);

export const emergencyKitItemSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().min(1).max(56),
  slug: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  categoryLabel: z.string().min(1),
  src: z.string().min(1),
  altText: z.string().min(8),
  extendedAltText: z.string().optional(),
  scenarioTags: z.array(z.string().min(1)).default([]),
  episode01Bindings: z.array(z.string().min(1)).default([]),
  auditFlag: emergencyKitAuditFlagSchema,
  prescriptiveCopy: z.boolean().optional(),
  notes: z.string().optional(),
});

export const emergencyKitInventorySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  version: z.string().min(1),
  framing: z.string().min(1),
  itemCount: z.number().int().positive(),
  categories: z
    .array(
      z.object({
        id: z.string().min(1),
        range: z.tuple([z.number().int(), z.number().int()]),
        label: z.string().min(1),
      }),
    )
    .min(1),
  curatedSets: z.record(z.string(), z.array(z.number().int())).optional(),
  auditFlagLegend: z.record(z.string(), z.string()).optional(),
  items: z.array(emergencyKitItemSchema).length(56),
});

export type EmergencyKitInventoryParsed = z.infer<
  typeof emergencyKitInventorySchema
>;

const EXPECTED_COUNT = 56;
const SENSITIVE_MED_NUMBERS = new Set([23, 24, 25]);

/** Dose / drug-name patterns that must not appear on non-prescriptive meds cards. */
const PRESCRIPTIVE_PATTERNS: Array<{ ruleId: string; pattern: RegExp; message: string }> =
  [
    {
      ruleId: "kit-prescriptive-dose",
      pattern: /\b\d+(\.\d+)?\s?(mg|mcg|µg|ug|ml|mL|units?|iu)\b/i,
      message:
        "Sensitive-meds kit items must stay non-prescriptive — no doses, volumes, or rates in catalog copy.",
    },
    {
      ruleId: "kit-prescriptive-drug-name",
      pattern:
        /\b(adrenaline|epinephrine|amiodarone|atropine|midazolam|morphine|fentanyl|ketamine|naloxone|salbutamol|albuterol)\b/i,
      message:
        "Sensitive-meds kit items must not name specific drugs — labels / authorised-compartment framing only.",
    },
  ];

function publicPathFromSrc(src: string, publicRoot: string): string | null {
  if (!src.startsWith("/")) return null;
  const relative = src.replace(/^\/+/, "").replace(/\//g, path.sep);
  return path.join(publicRoot, relative);
}

/**
 * Validate emergency-kit-inventory.json structure, contiguous 1–56 numbering,
 * alt text, on-disk src, and sensitive-meds / non-prescriptive flags for 23–25.
 */
export async function lintEmergencyKitInventory(
  data: unknown,
  filePath: string,
  publicRoot: string,
): Promise<ContinuityFinding[]> {
  const findings: ContinuityFinding[] = [];
  const parsed = emergencyKitInventorySchema.safeParse(data);

  if (!parsed.success) {
    findings.push({
      ruleId: "kit-inventory-schema",
      severity: "error",
      message: `emergency-kit-inventory failed Zod validation: ${parsed.error.message}`,
      path: filePath,
    });
    return findings;
  }

  const inventory = parsed.data;

  if (inventory.itemCount !== EXPECTED_COUNT) {
    findings.push({
      ruleId: "kit-inventory-count",
      severity: "error",
      message: `itemCount must be ${EXPECTED_COUNT}, found ${inventory.itemCount}.`,
      path: filePath,
    });
  }

  if (inventory.items.length !== EXPECTED_COUNT) {
    findings.push({
      ruleId: "kit-inventory-length",
      severity: "error",
      message: `items[] must contain exactly ${EXPECTED_COUNT} entries, found ${inventory.items.length}.`,
      path: filePath,
    });
  }

  const numbers = inventory.items.map((item) => item.number).sort((a, b) => a - b);
  for (let expected = 1; expected <= EXPECTED_COUNT; expected += 1) {
    if (numbers[expected - 1] !== expected) {
      findings.push({
        ruleId: "kit-inventory-contiguous",
        severity: "error",
        message: `Item numbers must be contiguous 1–${EXPECTED_COUNT} with no gaps; missing or out-of-order at ${expected} (got ${numbers[expected - 1] ?? "none"}).`,
        path: filePath,
      });
      break;
    }
  }

  const seenNumbers = new Set<number>();
  for (const item of inventory.items) {
    const loc = `${filePath}#${item.id}`;

    if (seenNumbers.has(item.number)) {
      findings.push({
        ruleId: "kit-inventory-duplicate-number",
        severity: "error",
        message: `Duplicate kit item number ${item.number}.`,
        path: loc,
      });
    }
    seenNumbers.add(item.number);

    if (!item.altText || item.altText.trim().length < 8) {
      findings.push({
        ruleId: "kit-inventory-alt-required",
        severity: "error",
        message: `Kit item ${item.number} ("${item.id}") requires concise altText.`,
        path: loc,
      });
    }

    const expectedSrc = `/media/emergency-kit/${String(item.number).padStart(2, "0")}-${item.slug}.png`;
    if (item.src !== expectedSrc) {
      findings.push({
        ruleId: "kit-inventory-src-pattern",
        severity: "error",
        message: `Kit item ${item.number} src must be "${expectedSrc}", found "${item.src}".`,
        path: loc,
      });
    }

    const diskPath = publicPathFromSrc(item.src, publicRoot);
    if (!diskPath) {
      findings.push({
        ruleId: "kit-inventory-src-invalid",
        severity: "error",
        message: `Kit item ${item.number} src must be a root-relative public path, found "${item.src}".`,
        path: loc,
      });
    } else {
      try {
        await access(diskPath);
      } catch {
        findings.push({
          ruleId: "kit-inventory-src-missing",
          severity: "error",
          message: `Kit item ${item.number} media file missing at public${item.src}.`,
          path: loc,
        });
      }
    }

    if (SENSITIVE_MED_NUMBERS.has(item.number)) {
      if (item.auditFlag !== "sensitive-meds") {
        findings.push({
          ruleId: "kit-sensitive-meds-flag",
          severity: "error",
          message: `Kit item ${item.number} must use auditFlag "sensitive-meds".`,
          path: loc,
        });
      }
      if (item.prescriptiveCopy !== false) {
        findings.push({
          ruleId: "kit-sensitive-meds-non-prescriptive",
          severity: "error",
          message: `Kit item ${item.number} must set prescriptiveCopy: false (non-prescriptive labels only).`,
          path: loc,
        });
      }
      const copy = [
        item.title,
        item.altText,
        item.extendedAltText ?? "",
        item.notes ?? "",
      ].join("\n");
      for (const rule of PRESCRIPTIVE_PATTERNS) {
        if (rule.pattern.test(copy)) {
          findings.push({
            ruleId: rule.ruleId,
            severity: "error",
            message: `Kit item ${item.number}: ${rule.message}`,
            path: loc,
            excerpt: copy.slice(0, 160),
          });
        }
      }
    }
  }

  return findings;
}

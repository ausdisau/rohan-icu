import { airwayReplacementLocked, evidenceSatisfied } from "./evidence";
import type {
  RichSimulationState,
  RoleId,
  SimulationActionDefinition,
} from "./types";

export interface ValidationIssue {
  actionId: string;
  reasons: string[];
}

const CLINICAL_FAMILY_BLOCK =
  "Family members cannot satisfy clinical role requirements.";

export function isFamilyRoleAttempt(role: string | undefined): boolean {
  if (!role) return false;
  return (
    role === "samira" ||
    role === "arvind" ||
    role === "leela" ||
    role.startsWith("family-")
  );
}

export function validateActionAssignment(
  state: RichSimulationState,
  action: SimulationActionDefinition,
  assignedRole?: RoleId | string,
  equipmentIds: string[] = [],
): string[] {
  const reasons: string[] = [];

  if (isFamilyRoleAttempt(assignedRole)) {
    reasons.push(CLINICAL_FAMILY_BLOCK);
  }

  if (
    assignedRole === "paid-support-worker" &&
    (action.domain === "airway" ||
      action.domain === "breathing" ||
      action.domain === "circulation") &&
    action.id !== "assign-paid-support-continuity"
  ) {
    reasons.push(
      "Paid support worker cannot satisfy clinical airway, breathing, or circulation requirements.",
    );
  }

  if (assignedRole && state.personnel[assignedRole as RoleId]) {
    const person = state.personnel[assignedRole as RoleId];
    if (person.status === "assigned" && person.assignedActionId !== action.id) {
      reasons.push(`Role ${assignedRole} is already assigned to another action.`);
    }
    if (person.status === "unavailable" || person.status === "exhausted") {
      reasons.push(`Role ${assignedRole} is ${person.status}.`);
    }
  }

  if (action.requiredRoles.length > 0) {
    if (isFamilyRoleAttempt(assignedRole)) {
      reasons.push(CLINICAL_FAMILY_BLOCK);
    } else if (!assignedRole) {
      reasons.push(
        `Clinical role required: ${action.requiredRoles.map((item) => item.role).join(" or ")}.`,
      );
    } else if (
      !action.requiredRoles.some((requirement) => requirement.role === assignedRole)
    ) {
      reasons.push(
        `Requires role ${action.requiredRoles.map((item) => item.role).join(" or ")}.`,
      );
    }
  }

  if (!evidenceSatisfied(action.requiredEvidence)) {
    reasons.push("Evidence threshold not met.");
  }

  if (airwayReplacementLocked(state, action)) {
    reasons.push(
      "Airway replacement remains locked without sufficient supporting evidence.",
    );
  }

  for (const requirement of action.requiredEquipment) {
    const item = state.equipment[requirement.equipmentId];
    if (!item || !item.available) {
      reasons.push(`Equipment missing: ${requirement.equipmentId}.`);
      continue;
    }
    if (requirement.mustBeVerified && !item.verified) {
      reasons.push(`Equipment unverified: ${requirement.equipmentId}.`);
    }
    if (
      item.role === "conditional-backup" &&
      !requirement.allowConditionalBackup
    ) {
      reasons.push(
        `Conditional backup ${requirement.equipmentId} is not authorised for this action.`,
      );
    }
  }

  for (const equipmentId of equipmentIds) {
    const item = state.equipment[equipmentId];
    if (item?.warnings.includes("may-displace-aac")) {
      reasons.push("Selected equipment may displace AAC access.");
    }
  }

  // Readiness never unlocks indication by itself — surfaced as guidance when
  // someone tries to replace airway solely because spare tube is available.
  if (
    (action.id === "replace-airway" || action.id.includes("replace-airway")) &&
    state.equipment["spare-trach-same-size"]?.available &&
    !state.domains.airway.replacementIndicated
  ) {
    reasons.push(
      "Equipment readiness does not create indication for airway replacement.",
    );
  }

  return [...new Set(reasons)];
}

/**
 * Partial bundle acceptance: valid actions commit; invalid ones are blocked
 * without rejecting the whole bundle.
 */
export function partitionBundle(
  state: RichSimulationState,
  catalog: Record<string, SimulationActionDefinition>,
  actionIds: string[],
  assignments: Record<string, { role?: RoleId; equipmentIds?: string[] }> = {},
): { accepted: string[]; blocked: ValidationIssue[] } {
  const accepted: string[] = [];
  const blocked: ValidationIssue[] = [];
  const seen = new Set<string>();

  for (const actionId of actionIds) {
    if (seen.has(actionId)) {
      blocked.push({
        actionId,
        reasons: [
          "Duplicate command becomes closed-loop confirmation — intervention is not repeated.",
        ],
      });
      continue;
    }
    seen.add(actionId);

    const action = catalog[actionId];
    if (!action) {
      blocked.push({ actionId, reasons: ["Unknown action."] });
      continue;
    }

    const assignment = assignments[actionId] ?? {};
    const reasons = validateActionAssignment(
      state,
      action,
      assignment.role,
      assignment.equipmentIds ?? [],
    );

    if (reasons.length > 0) {
      blocked.push({ actionId, reasons });
    } else {
      accepted.push(actionId);
    }
  }

  return { accepted, blocked };
}

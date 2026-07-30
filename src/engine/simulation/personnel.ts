/** Tree-parity personnel types. */
export type { PersonnelState, PersonnelStatus, RoleId } from "./types";

export function roleIsDoubleAssigned(
  status: import("./types").PersonnelStatus,
  assignedActionId: string | undefined,
  requestedActionId: string,
): boolean {
  return status === "assigned" && assignedActionId !== requestedActionId;
}

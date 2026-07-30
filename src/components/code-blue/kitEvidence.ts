/**
 * Kit evidence mapping adapted from ChatGPT's interactive Code Blue interface
 * (feature/interactive-code-blue). Selected assets are UI evidence cues only —
 * they do not invent clinical indication; the Phase 2 engine remains authoritative.
 */

export type KitDomain =
  | "airway"
  | "breathing"
  | "circulation"
  | "access"
  | "family";

export interface KitEquipmentItem {
  number: number;
  title: string;
  src: string;
  domain: KitDomain;
  initialState: "ready" | "maintain" | "verify" | "conditional";
}

/** Catalog / pack action id → kit asset numbers required before commit (soft gate). */
export const ACTION_KIT_REQUIREMENTS: Record<string, number[]> = {
  "protect-aac": [27, 28, 34, 35],
  "prepare-defibrillator": [18, 19, 20],
  "assess-chest-movement": [17, 12],
  "assess-borrowed-circuit": [9, 10],
  "assign-suction-bedside-reserve": [7, 8],
  "correct-external-circuit-load": [9, 10, 17],
  "assign-paid-support-continuity": [41, 42],
  "replace-airway": [3, 4],
};

export const KIT_EQUIPMENT: KitEquipmentItem[] = [
  {
    number: 3,
    title: "Alternative emergency airway",
    src: "/media/emergency-kit/03-alternative-emergency-airway-as-specified.png",
    domain: "airway",
    initialState: "maintain",
  },
  {
    number: 4,
    title: "Current airway plan card",
    src: "/media/emergency-kit/04-airway-plan-card-current-revision.png",
    domain: "airway",
    initialState: "verify",
  },
  {
    number: 7,
    title: "Suction catheters",
    src: "/media/emergency-kit/07-suction-catheters-multiple-sizes.png",
    domain: "breathing",
    initialState: "ready",
  },
  {
    number: 8,
    title: "Portable suction unit",
    src: "/media/emergency-kit/08-portable-suction-unit-battery-powered.png",
    domain: "breathing",
    initialState: "conditional",
  },
  {
    number: 9,
    title: "Spare ventilator circuit",
    src: "/media/emergency-kit/09-spare-ventilator-circuit.png",
    domain: "breathing",
    initialState: "conditional",
  },
  {
    number: 10,
    title: "Connectors and adapters",
    src: "/media/emergency-kit/10-connectors-and-adapters.png",
    domain: "breathing",
    initialState: "verify",
  },
  {
    number: 12,
    title: "Manual resuscitator",
    src: "/media/emergency-kit/12-manual-resuscitator-bag-valve.png",
    domain: "breathing",
    initialState: "ready",
  },
  {
    number: 15,
    title: "Charged backup batteries",
    src: "/media/emergency-kit/15-backup-batteries-charged.png",
    domain: "breathing",
    initialState: "ready",
  },
  {
    number: 17,
    title: "Chest movement indicator",
    src: "/media/emergency-kit/17-chest-movement-indicator.png",
    domain: "breathing",
    initialState: "ready",
  },
  {
    number: 18,
    title: "Defibrillator",
    src: "/media/emergency-kit/18-defibrillator-aed.png",
    domain: "circulation",
    initialState: "ready",
  },
  {
    number: 19,
    title: "Portable cardiac monitor",
    src: "/media/emergency-kit/19-cardiac-monitor-portable.png",
    domain: "circulation",
    initialState: "maintain",
  },
  {
    number: 20,
    title: "Monitoring leads and sensors",
    src: "/media/emergency-kit/20-monitoring-leads-and-sensors.png",
    domain: "circulation",
    initialState: "verify",
  },
  {
    number: 21,
    title: "Blood pressure cuff",
    src: "/media/emergency-kit/21-blood-pressure-cuff.png",
    domain: "circulation",
    initialState: "ready",
  },
  {
    number: 26,
    title: "Timers",
    src: "/media/emergency-kit/26-timers.png",
    domain: "circulation",
    initialState: "ready",
  },
  {
    number: 27,
    title: "Offline AAC device",
    src: "/media/emergency-kit/27-aac-device-offline.png",
    domain: "access",
    initialState: "maintain",
  },
  {
    number: 28,
    title: "Spare cheek switch",
    src: "/media/emergency-kit/28-cheek-switch-spare.png",
    domain: "access",
    initialState: "ready",
  },
  {
    number: 34,
    title: "Emergency vocabulary",
    src: "/media/emergency-kit/34-emergency-vocabulary.png",
    domain: "access",
    initialState: "ready",
  },
  {
    number: 35,
    title: "Offline communication guide",
    src: "/media/emergency-kit/35-offline-emergency-communication-guide.png",
    domain: "access",
    initialState: "ready",
  },
  {
    number: 41,
    title: "Roles and responsibilities card",
    src: "/media/emergency-kit/41-roles-and-responsibilities-card.png",
    domain: "family",
    initialState: "ready",
  },
  {
    number: 42,
    title: "Privacy and dignity guidelines",
    src: "/media/emergency-kit/42-privacy-and-dignity-guidelines.png",
    domain: "family",
    initialState: "ready",
  },
];

export const DEFAULT_SELECTED_KIT_ASSETS = [3, 18, 19, 27];

export function missingKitAssetsForActions(
  actionIds: string[],
  selectedAssets: number[],
): number[] {
  const selected = new Set(selectedAssets);
  const missing = new Set<number>();
  for (const actionId of actionIds) {
    const required = ACTION_KIT_REQUIREMENTS[actionId] ?? [];
    for (const asset of required) {
      if (!selected.has(asset)) missing.add(asset);
    }
  }
  return [...missing].sort((a, b) => a - b);
}

export function formatKitAssetIds(assets: number[]): string {
  return assets.map((item) => String(item).padStart(2, "0")).join(", ");
}

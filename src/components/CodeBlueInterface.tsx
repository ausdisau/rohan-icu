"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type Domain = "airway" | "breathing" | "circulation" | "access" | "family";
type Phase = "arrest" | "provisional-rosc" | "post-rosc";

type Action = {
  id: string;
  label: string;
  team: string;
  domain: Domain;
  requiredAssets: number[];
  effect: string;
};

type Equipment = {
  number: number;
  title: string;
  src: string;
  domain: Domain;
  initialState: "ready" | "maintain" | "verify" | "conditional";
};

const equipment: Equipment[] = [
  { number: 3, title: "Alternative emergency airway", src: "/media/emergency-kit/03-alternative-emergency-airway-as-specified.png", domain: "airway", initialState: "maintain" },
  { number: 4, title: "Current airway plan card", src: "/media/emergency-kit/04-airway-plan-card-current-revision.png", domain: "airway", initialState: "verify" },
  { number: 7, title: "Suction catheters", src: "/media/emergency-kit/07-suction-catheters-multiple-sizes.png", domain: "breathing", initialState: "ready" },
  { number: 8, title: "Portable suction unit", src: "/media/emergency-kit/08-portable-suction-unit-battery-powered.png", domain: "breathing", initialState: "conditional" },
  { number: 9, title: "Spare ventilator circuit", src: "/media/emergency-kit/09-spare-ventilator-circuit.png", domain: "breathing", initialState: "conditional" },
  { number: 10, title: "Connectors and adapters", src: "/media/emergency-kit/10-connectors-and-adapters.png", domain: "breathing", initialState: "verify" },
  { number: 12, title: "Manual resuscitator", src: "/media/emergency-kit/12-manual-resuscitator-bag-valve.png", domain: "breathing", initialState: "ready" },
  { number: 15, title: "Charged backup batteries", src: "/media/emergency-kit/15-backup-batteries-charged.png", domain: "breathing", initialState: "ready" },
  { number: 17, title: "Chest movement indicator", src: "/media/emergency-kit/17-chest-movement-indicator.png", domain: "breathing", initialState: "ready" },
  { number: 18, title: "Defibrillator", src: "/media/emergency-kit/18-defibrillator-aed.png", domain: "circulation", initialState: "ready" },
  { number: 19, title: "Portable cardiac monitor", src: "/media/emergency-kit/19-cardiac-monitor-portable.png", domain: "circulation", initialState: "maintain" },
  { number: 20, title: "Monitoring leads and sensors", src: "/media/emergency-kit/20-monitoring-leads-and-sensors.png", domain: "circulation", initialState: "verify" },
  { number: 21, title: "Blood pressure cuff", src: "/media/emergency-kit/21-blood-pressure-cuff.png", domain: "circulation", initialState: "ready" },
  { number: 26, title: "Timers", src: "/media/emergency-kit/26-timers.png", domain: "circulation", initialState: "ready" },
  { number: 27, title: "Offline AAC device", src: "/media/emergency-kit/27-aac-device-offline.png", domain: "access", initialState: "maintain" },
  { number: 28, title: "Spare cheek switch", src: "/media/emergency-kit/28-cheek-switch-spare.png", domain: "access", initialState: "ready" },
  { number: 34, title: "Emergency vocabulary", src: "/media/emergency-kit/34-emergency-vocabulary.png", domain: "access", initialState: "ready" },
  { number: 35, title: "Offline communication guide", src: "/media/emergency-kit/35-offline-emergency-communication-guide.png", domain: "access", initialState: "ready" },
  { number: 41, title: "Roles and responsibilities card", src: "/media/emergency-kit/41-roles-and-responsibilities-card.png", domain: "family", initialState: "ready" },
  { number: 42, title: "Privacy and dignity guidelines", src: "/media/emergency-kit/42-privacy-and-dignity-guidelines.png", domain: "family", initialState: "ready" },
];

const actions: Action[] = [
  { id: "maintain-airway", label: "Maintain established airway", team: "Airway lead", domain: "airway", requiredAssets: [3, 4], effect: "Existing airway remains the working route unless evidence proves failure." },
  { id: "assess-circuit", label: "Assess active circuit", team: "Respiratory", domain: "breathing", requiredAssets: [9, 10, 12, 17], effect: "External circuit loading is checked before assuming airway displacement." },
  { id: "monitor-rhythm", label: "Verify rhythm and pulse", team: "ICU circulation", domain: "circulation", requiredAssets: [19, 20, 26], effect: "Monitor data is paired with direct bedside assessment." },
  { id: "defibrillator-ready", label: "Prepare defibrillator", team: "ICU circulation", domain: "circulation", requiredAssets: [18], effect: "The defibrillator is prepared for an authorised shockable-rhythm response." },
  { id: "protect-access", label: "Protect AAC and cheek switch", team: "AAC / disability access", domain: "access", requiredAssets: [27, 28, 34, 35], effect: "No questions during arrest; communication access is restored after immediate rescue." },
  { id: "family-boundary", label: "Protect family role boundaries", team: "Family liaison", domain: "family", requiredAssets: [41, 42], effect: "Samira and Arvind remain family supports, not clinical workforce." },
];

const domainStyles: Record<Domain, string> = {
  airway: "border-sky-700 bg-sky-50 text-sky-950",
  breathing: "border-blue-700 bg-blue-50 text-blue-950",
  circulation: "border-red-700 bg-red-50 text-red-950",
  access: "border-emerald-700 bg-emerald-50 text-emerald-950",
  family: "border-violet-700 bg-violet-50 text-violet-950",
};

export function CodeBlueInterface() {
  const [phase, setPhase] = useState<Phase>("arrest");
  const [selectedAssets, setSelectedAssets] = useState<number[]>([3, 18, 19, 27]);
  const [queue, setQueue] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([
    "03:21 Code Blue activated after further alarm and loss of pulse.",
    "03:21 Pulseless broad-complex ventricular rhythm confirmed.",
    "03:22 WAIT preserved; no questions asked during arrest.",
  ]);
  const [announcement, setAnnouncement] = useState("Code Blue interface ready.");

  const pulseLabel = phase === "arrest" ? "Absent" : phase === "provisional-rosc" ? "Weak, present" : "Present, fragile";
  const rhythmLabel = phase === "arrest" ? "Shockable ventricular rhythm" : "Organised rhythm with frequent ectopy";
  const queuedActions = useMemo(() => queue.map((id) => actions.find((action) => action.id === id)).filter(Boolean) as Action[], [queue]);

  function toggleAsset(number: number) {
    setSelectedAssets((current) => current.includes(number) ? current.filter((item) => item !== number) : [...current, number]);
  }

  function queueAction(action: Action) {
    if (queue.includes(action.id)) return;
    setQueue((current) => [...current, action.id]);
    setAnnouncement(`${action.label} added to the action queue.`);
  }

  function commitQueue() {
    if (queue.length === 0) {
      setAnnouncement("No actions are queued.");
      return;
    }

    const missing = queuedActions.flatMap((action) => action.requiredAssets.filter((asset) => !selectedAssets.includes(asset)));
    const uniqueMissing = [...new Set(missing)];
    if (uniqueMissing.length > 0) {
      setAnnouncement(`Commit blocked. Select or verify assets ${uniqueMissing.map((item) => String(item).padStart(2, "0")).join(", ")}.`);
      return;
    }

    const entries = queuedActions.map((action) => `${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ${action.team}: ${action.effect}`);
    setLog((current) => [...current, ...entries]);

    const hasCirculation = queue.includes("monitor-rhythm") && queue.includes("defibrillator-ready");
    const hasAirway = queue.includes("maintain-airway") && queue.includes("assess-circuit");
    const hasAccess = queue.includes("protect-access");

    if (phase === "arrest" && hasCirculation && hasAirway) {
      setPhase("provisional-rosc");
      setAnnouncement("Provisional ROSC achieved. Pulse requires independent confirmation; post-ROSC reassessment remains mandatory.");
    } else if (phase === "provisional-rosc" && hasCirculation && hasAccess) {
      setPhase("post-rosc");
      setAnnouncement("Post-ROSC phase entered. Communication access restored without demanding a response.");
    } else {
      setAnnouncement("Actions committed. The clinical phase has not changed because the full evidence bundle is incomplete.");
    }

    setQueue([]);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-sm border-2 border-red-700 bg-red-700 px-4 py-3 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">Interactive emergency simulation</p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl">Code Blue active</h1>
          </div>
          <div className="rounded-sm border border-white/60 px-3 py-2 text-sm font-semibold">Phase: {phase.replace("-", " ")}</div>
        </div>
      </div>

      <p className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-muted)]">
        Educational simulation only. Procedures, defibrillation, ventilation, medication and emergency treatment remain clinician-controlled. Equipment readiness does not create an indication.
      </p>

      <div aria-live="polite" className="rounded-sm border-2 border-[var(--color-focus)] bg-[var(--color-accent-soft)] p-3 text-sm font-medium text-[var(--color-ink)]">
        {announcement}
      </div>

      <div className="grid gap-5 xl:grid-cols-[16rem_minmax(0,1fr)_20rem]">
        <aside className="space-y-4 rounded-sm bg-slate-950 p-4 text-white">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Patient state</h2>
          {[
            ["Rhythm", rhythmLabel],
            ["Pulse", pulseLabel],
            ["Airway", "Established acute ET route"],
            ["Breathing", "Controlled ventilation under assessment"],
            ["AAC", "Protected; WAIT remains active"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-sm border border-slate-700 bg-slate-900 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 text-sm font-semibold">{value}</p>
            </div>
          ))}

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Event log</h3>
            <ol className="mt-2 space-y-2 text-xs text-slate-300">
              {log.slice(-8).map((entry, index) => <li key={`${entry}-${index}`}>{entry}</li>)}
            </ol>
          </div>
        </aside>

        <main className="space-y-5">
          <section className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">Action stations</p>
                <h2 className="font-[family-name:var(--font-display)] text-2xl">Assign evidence-led actions</h2>
              </div>
              <p className="max-w-md text-sm text-[var(--color-muted)]">Select the equipment needed by an action, queue the action, then commit. Missing assets block the commit rather than silently assuming readiness.</p>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => queueAction(action)}
                  className={`rounded-sm border-l-4 p-4 text-left transition hover:translate-y-[-1px] ${domainStyles[action.domain]}`}
                >
                  <span className="block text-xs font-semibold uppercase tracking-wide">{action.team}</span>
                  <span className="mt-1 block font-semibold">{action.label}</span>
                  <span className="mt-2 block text-xs">Requires {action.requiredAssets.map((asset) => String(asset).padStart(2, "0")).join(", ")}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">Equipment inventory</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Select an asset to make it available to queued actions. Images are evidence cues, not magic-item solutions.</p>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {equipment.map((item) => {
                const selected = selectedAssets.includes(item.number);
                return (
                  <li key={item.number}>
                    <button
                      type="button"
                      onClick={() => toggleAsset(item.number)}
                      aria-pressed={selected}
                      className={`flex h-full w-full flex-col overflow-hidden rounded-sm border-2 text-left ${selected ? "border-[var(--color-focus)] bg-[var(--color-accent-soft)]" : "border-[var(--color-line)] bg-white hover:border-[var(--color-accent)]"}`}
                    >
                      <span className="relative block aspect-square w-full bg-white">
                        <Image src={item.src} alt={`${item.number}. ${item.title}`} fill sizes="180px" className="object-contain" />
                      </span>
                      <span className="flex flex-1 flex-col p-2.5">
                        <span className="text-xs font-bold text-[var(--color-accent)]">{String(item.number).padStart(2, "0")}</span>
                        <span className="mt-1 text-sm font-semibold leading-snug">{item.title}</span>
                        <span className="mt-auto pt-2 text-xs text-[var(--color-muted)]">{selected ? "Selected" : item.initialState}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </main>

        <aside className="space-y-4 rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-xl">Action queue</h2>
            <span className="rounded-full bg-[var(--color-wash)] px-2.5 py-1 text-xs font-semibold">{queue.length}</span>
          </div>

          {queuedActions.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Queue an action from the centre panel.</p>
          ) : (
            <ol className="space-y-2">
              {queuedActions.map((action) => (
                <li key={action.id} className={`rounded-sm border-l-4 p-3 ${domainStyles[action.domain]}`}>
                  <p className="text-sm font-semibold">{action.label}</p>
                  <p className="mt-1 text-xs">{action.team}</p>
                  <button type="button" onClick={() => setQueue((current) => current.filter((id) => id !== action.id))} className="mt-2 text-xs underline">Remove</button>
                </li>
              ))}
            </ol>
          )}

          <button type="button" onClick={commitQueue} className="w-full rounded-sm bg-[var(--color-accent)] px-4 py-3 font-semibold text-white hover:bg-[var(--color-focus)]">
            Commit queued actions
          </button>

          <button type="button" onClick={() => { setQueue([]); setAnnouncement("Action queue cleared. No clinical action repeated."); }} className="w-full rounded-sm border border-[var(--color-line)] px-4 py-2 text-sm">
            Clear queue
          </button>

          <section className="rounded-sm border border-violet-300 bg-violet-50 p-3 text-sm text-violet-950">
            <h3 className="font-semibold">Family and access boundary</h3>
            <p className="mt-2">Samira: presence and values witness.</p>
            <p>Arvind: privacy, logistics and continuity.</p>
            <p className="mt-2 font-medium">Neither is clinical workforce.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

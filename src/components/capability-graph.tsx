"use client";
import { Localized } from "@/components/localized";


import { useState } from "react";
import { CapacityGraph3D } from "@/components/capacity-graph-3d";
import { buildDemoCapacityGraph } from "@/lib/capacity-graph-view";
import styles from "./capability-graph.module.css";

type CapabilityKey = "finance" | "spanish" | "content" | "research" | "ai" | "operations" | "sales" | "french" | "saas";

type Capability = {
  key: CapabilityKey;
  label: string;
  x: number;
  y: number;
};

const capabilities: Capability[] = [
  { key: "finance", label: "Finance", x: 18, y: 35 },
  { key: "spanish", label: "Spanish", x: 47, y: 25 },
  { key: "content", label: "Content", x: 78, y: 36 },
  { key: "sales", label: "Sales", x: 28, y: 55 },
  { key: "french", label: "French", x: 56, y: 55 },
  { key: "saas", label: "SaaS", x: 79, y: 56 },
  { key: "research", label: "Research", x: 17, y: 76 },
  { key: "ai", label: "AI", x: 49, y: 79 },
  { key: "operations", label: "Operations", x: 82, y: 73 },
];

const combinations: Record<CapabilityKey, { keys: CapabilityKey[]; offer: string; signal: string }> = {
  finance: { keys: ["finance", "spanish", "content"], offer: "Fintech Localization", signal: "Strong cross-border content demand" },
  spanish: { keys: ["finance", "spanish", "content"], offer: "Fintech Localization", signal: "Strong cross-border content demand" },
  content: { keys: ["finance", "spanish", "content"], offer: "Fintech Localization", signal: "Strong cross-border content demand" },
  research: { keys: ["research", "ai", "operations"], offer: "AI Market Researcher", signal: "Package as a two-week insight sprint" },
  ai: { keys: ["research", "ai", "operations"], offer: "AI Market Researcher", signal: "Package as a two-week insight sprint" },
  operations: { keys: ["research", "ai", "operations"], offer: "AI Market Researcher", signal: "Package as a two-week insight sprint" },
  sales: { keys: ["sales", "french", "saas"], offer: "Cross-border GTM", signal: "Validate with five targeted founder calls" },
  french: { keys: ["sales", "french", "saas"], offer: "Cross-border GTM", signal: "Validate with five targeted founder calls" },
  saas: { keys: ["sales", "french", "saas"], offer: "Cross-border GTM", signal: "Validate with five targeted founder calls" },
};

const byKey = Object.fromEntries(capabilities.map((capability) => [capability.key, capability])) as Record<CapabilityKey, Capability>;
const demoGraph = buildDemoCapacityGraph();

export function CapabilityGraph() {
  return <Localized><CapacityGraph3D
    graph={demoGraph}
    mode="demo"
    onExploreOpportunities={() => document.getElementById("analyze")?.scrollIntoView({ behavior: "smooth", block: "start" })}
    fallback={<CapabilityGraphFallback />}
  /></Localized>;
}

function CapabilityGraphFallback() {
  const [selectedKey, setSelectedKey] = useState<CapabilityKey>("research");
  const selected = combinations[selectedKey];
  const active = new Set(selected.keys);
  const points = selected.keys.map((key) => byKey[key]);
  const links: [Capability, Capability][] = [[points[0], points[1]], [points[1], points[2]], [points[2], points[0]]];

  return <Localized><section className={`shell ${styles.section}`} aria-labelledby="capability-graph-title">
    <div className={styles.heading}>
      <div>
        <p className={styles.kicker}>Your skills are more valuable in combination</p>
        <h2 id="capability-graph-title" className={styles.title}>See how capabilities attract opportunity</h2>
      </div>
      <p className={styles.hint}>Hover or tap any capability to reveal the package hidden between them</p>
    </div>
    <div className={styles.panel}>
      <div className={styles.visual}>
        <div className={styles.visualLabel}><strong>Skills attract opportunity</strong><span>Related capabilities snap into focus</span></div>
        <svg className={styles.links} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {links.map(([start, end], index) => <line key={`${selectedKey}-${index}`} className={styles.link} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />)}
        </svg>
        {capabilities.map((capability) => <button
          key={capability.key}
          type="button"
          className={`${styles.node} ${active.has(capability.key) ? styles.nodeActive : styles.nodeDim}`}
          style={{ left: `${capability.x}%`, top: `${capability.y}%` }}
          onPointerEnter={() => setSelectedKey(capability.key)}
          onFocus={() => setSelectedKey(capability.key)}
          onClick={() => setSelectedKey(capability.key)}
          aria-label={`Explore combinations containing ${capability.label}`}
          aria-pressed={selectedKey === capability.key}
        >{capability.label}</button>)}
      </div>
      <aside className={styles.reveal} aria-live="polite">
        <div>
          <div className={styles.revealLabel}>Commercial pattern found</div>
          <h3 className={styles.offer}>{selected.offer}</h3>
          <div className={styles.skills}>{selected.keys.map((key, index) => <span key={key}>{index > 0 && <span aria-hidden="true">↔ </span>}<strong>{byKey[key].label}</strong></span>)}</div>
        </div>
        <div className={styles.signal}><div className={styles.signalLabel}>Packaging angle</div><div className={styles.signalValue}>{selected.signal}</div></div>
      </aside>
    </div>
  </section></Localized>;
}

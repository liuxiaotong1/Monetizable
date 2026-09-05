"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import styles from "./capacity-graph-3d.module.css";
import {
  projectCapacityGraph,
  type CapacitySceneNode,
} from "@/lib/capacity-graph-view";
import { demoCombinationInsight } from "@/lib/demo-career-insights";
import type { CapacityGraph, CapacityNodeType } from "@/lib/types";

export { demoCombinationInsight } from "@/lib/demo-career-insights";

const CapacityGraphCanvas = dynamic(
  () =>
    import("@/components/capacity-graph-canvas").then(
      (module) => module.CapacityGraphCanvas,
    ),
  {
    ssr: false,
    loading: () => <div className={styles.loading}>Mapping capacities</div>,
  },
);

export interface CapacityGraph3DProps {
  graph: CapacityGraph;
  mode: "demo" | "personalized";
  onExploreOpportunities?: (combinationIndex?: number) => void;
  fallback?: ReactNode;
}

const typeNames: Record<CapacityNodeType, string> = {
  skill: "Capability",
  domain: "Domain expertise",
  industry: "Industry knowledge",
  language: "Language advantage",
  tool: "Tool",
  experience: "Experience",
  strength: "Core strength",
  interest: "Commercial interest",
  constraint: "Constraint",
};

function nodeId(value: string | CapacitySceneNode | undefined) {
  return typeof value === "object" && value ? value.id : value;
}

function supportsWebGl() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

export function CapacityGraph3D({
  graph,
  mode,
  onExploreOpportunities,
  fallback,
}: CapacityGraph3DProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasReadyRef = useRef(false);
  const scene = useMemo(
    () => projectCapacityGraph(graph, mode === "demo" ? 42 : 60),
    [graph, mode],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [canRender, setCanRender] = useState<boolean | null>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [active, setActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const supported = supportsWebGl();
      setCanRender(supported);
      if (supported) setHasEntered(true);
    });
    const fallbackTimer = window.setTimeout(() => {
      if (!canvasReadyRef.current) setCanRender(false);
    }, 8_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(fallbackTimer);
    };
  }, []);
  useEffect(() => {
    const element = sectionRef.current;
    if (!element || !canRender) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setActive(entry.isIntersecting);
        if (entry.isIntersecting) setHasEntered(true);
      },
      { rootMargin: "280px 0px", threshold: 0.01 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [canRender]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isFullscreen) document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSelectedIds([]);
      setIsFullscreen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      if (isFullscreen) document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isFullscreen]);

  const selectedId = selectedIds.at(-1);
  const selected = scene.nodes.find((node) => node.id === selectedId);
  const selectedNodes = selectedIds.flatMap((id) => scene.nodes.find((node) => node.id === id) ?? []);
  const demoInsight = mode === "demo" && selectedNodes.length >= 2 ? demoCombinationInsight(selectedNodes.map((node) => node.label)) : null;

  function selectNode(id: string | undefined) {
    if (!id) { setSelectedIds([]); return; }
    if (mode !== "demo") { setSelectedIds([id]); return; }
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current.slice(-2), id]);
  }
  const connected = useMemo(() => {
    if (!selected) return [];
    return scene.links
      .flatMap((link) => {
        const source = nodeId(link.source);
        const target = nodeId(link.target);
        if (source !== selected.id && target !== selected.id) return [];
        const neighborId = source === selected.id ? target : source;
        const neighbor = scene.nodes.find((node) => node.id === neighborId);
        return neighbor ? [{ node: neighbor, link }] : [];
      })
      .sort((left, right) => right.node.importance - left.node.importance)
      .slice(0, 4);
  }, [scene, selected]);
  const combinations = selected
    ? selected.combinationIndexes
        .map((index) => ({ index, combination: graph.combinations[index] }))
        .filter((item) => item.combination)
        .slice(0, 3)
    : [];
  const leadingCombination = combinations[0];

  if (canRender === false || scene.nodes.length === 0)
    return fallback ?? <StaticCapacityGraph graph={graph} />;

  return (
    <section
      ref={sectionRef}
      className={`${mode === "demo" ? "shell " : ""}${styles.section}`}
      aria-labelledby={`capacity-graph-${mode}-title`}
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>
            {mode === "demo"
              ? "Your skills are more valuable in combination"
              : "Your evidence-backed Capacity Graph"}
          </p>
          <h2 id={`capacity-graph-${mode}-title`} className={styles.title}>
            {mode === "demo"
              ? "See how capabilities attract opportunity"
              : "Explore the building blocks you can recombine"}
          </h2>
        </div>
        <p className={styles.hint}>
          {mode === "demo"
            ? "Select any 2–3 spheres to reveal a possible role, buyer demand and an earning benchmark."
            : "Built only from evidence in your profile. Select a node to inspect its proof and commercial connections."}
        </p>
      </div>
      <div
        className={`${styles.frame} ${isFullscreen ? styles.frameFullscreen : ""}`}
      >
        <div className={styles.graphPane}>
          <div className={styles.toolbar}>
            {mode === "demo" && (
              <span className={styles.demoBadge}>Example Capacity Graph</span>
            )}
            <label>
              <span className="sr-only">Select a capacity to explore</span>
              <select
                className={styles.nodePicker}
                value={selected?.id ?? ""}
                onChange={(event) => selectNode(event.target.value || undefined)}
              >
                <option value="">{mode === "demo" ? "Select up to 3 capacities" : "Select a capacity"}</option>
                {scene.nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={styles.fullscreenButton}
              aria-pressed={isFullscreen}
              onClick={() => setIsFullscreen((current) => !current)}
            >
              <span aria-hidden="true">{isFullscreen ? "×" : "⛶"}</span>
              <span>{isFullscreen ? "Exit full screen" : "Full screen"}</span>
            </button>
          </div>
          <div className={styles.canvas}>
            {hasEntered && (
              <CapacityGraphCanvas
                scene={scene}
                selectedId={selectedId}
                selectedIds={selectedIds}
                active={active || isFullscreen}
                fullscreen={isFullscreen}
                onReady={() => {
                  canvasReadyRef.current = true;
                  setCanvasReady(true);
                }}
                onSelect={selectNode}
                onClear={() => selectNode(undefined)}
              />
            )}
            {(!hasEntered || !canvasReady) && (
              <div className={styles.loading}>Mapping capacities</div>
            )}
          </div>
          <p className={styles.graphHelp}>
            {mode === "demo" ? `${selectedNodes.length}/3 selected · Click spheres to combine · Drag to rotate` : isFullscreen
              ? "Drag to rotate · Scroll to zoom · Select a node to focus"
              : "Drag to rotate · Select a node to focus · Full screen to zoom"}
          </p>
        </div>
        <aside className={styles.detail} aria-live="polite">
          {demoInsight ? (
            <>
              <div className={styles.detailHeader}>
                <div className={styles.nodeType}>Possible commercial direction</div>
                <div className={styles.selectedSkills}>{selectedNodes.map((node) => <button type="button" key={node.id} onClick={() => selectNode(node.id)}>{node.label} <span aria-hidden="true">×</span></button>)}</div>
                <h3 className={styles.insightCareer}>{demoInsight.career}</h3>
              </div>
              <div className={styles.detailBlock}><div className={styles.detailLabel}>Potential buyers to explore</div><p className={styles.evidence}>{demoInsight.market}</p></div>
              <div className={styles.detailBlock}><div className={styles.detailLabel}>Illustrative earning range</div><p className={styles.benchmark}>{demoInsight.earning}</p><p className={styles.evidence}>Demo estimate, not verified salary data or a promise of earnings. Validate against current roles in your location and at your experience level.</p></div>
              <div className={styles.detailBlock}>
                <div className={styles.detailLabel}>Illustrative role profile</div>
                <div className={styles.roleModel}><div><strong>{demoInsight.roleModel}</strong><p>{demoInsight.roleModelSummary}</p></div></div>
              </div>
              {onExploreOpportunities ? <button type="button" className={styles.cta} onClick={() => onExploreOpportunities()}><span>Build my Capacity Graph</span><span aria-hidden="true">→</span></button> : null}
            </>
          ) : mode === "demo" && selectedNodes.length ? (
            <div className={styles.detailHeader}>
              <div className={styles.nodeType}>{selectedNodes.length} of 3 selected</div>
              <div className={styles.selectedSkills}>{selectedNodes.map((node) => <button type="button" key={node.id} onClick={() => selectNode(node.id)}>{node.label} <span aria-hidden="true">×</span></button>)}</div>
              <h3 className={styles.insightCareer}>Choose one more sphere</h3>
              <p className={styles.evidence}>Add a second or third capability to reveal a possible role, companies with demand, an earning benchmark and a benchmark profile.</p>
            </div>
          ) : selected ? (
            <>
              <div className={styles.detailHeader}>
                <div className={styles.nodeType}>
                  {typeNames[selected.type]}
                </div>
                <h3 className={styles.nodeName}>
                  <span className={styles.nodeDot} />
                  <span className={styles.nodeNameText}>{selected.label}</span>
                </h3>
              </div>
              <div className={styles.detailBlock}>
                <div className={styles.detailLabel}>
                  Evidence found in your profile
                </div>
                <p className={styles.evidence}>
                  {selected.evidence[0] ??
                    "This capacity is supported by the supplied profile evidence."}
                </p>
              </div>
              <div className={styles.detailBlock}>
                <div className={styles.detailLabel}>Strongly connected</div>
                <div className={styles.connections}>
                  {connected.length ? (
                    connected.map(({ node }) => (
                      <div key={node.id} className={styles.connection}>
                        <span>{node.label}</span>
                      </div>
                    ))
                  ) : (
                    <p className={styles.evidence}>
                      Select another node to explore its adjacent capacities.
                    </p>
                  )}
                </div>
              </div>
              <div className={styles.detailBlock}>
                <div className={styles.detailLabel}>Potential combinations</div>
                <div className={styles.combinations}>
                  {combinations.length ? (
                    combinations.map(({ index, combination }) => (
                      <button
                        type="button"
                        key={`${index}-${combination.elements.join("-")}`}
                        className={styles.combination}
                        onClick={() =>
                          focusCombination(
                            combination.elements,
                            scene.nodes,
                            selectNode,
                          )
                        }
                      >
                        <span>{combination.elements.join(" × ")}</span>
                      </button>
                    ))
                  ) : (
                    <p className={styles.evidence}>
                      This node strengthens the wider graph, but is not part of
                      a ranked combination yet.
                    </p>
                  )}
                </div>
              </div>
              <div className={styles.detailBlock}>
                <div className={styles.detailLabel}>Why it works</div>
                <p className={styles.why}>
                  {leadingCombination?.combination.differentiation ??
                    selected.evidence[1] ??
                    "It connects a demonstrated capacity with adjacent commercial strengths."}
                </p>
              </div>
              {onExploreOpportunities && mode !== "demo" && (
                <button
                  type="button"
                  className={styles.cta}
                  onClick={() =>
                    onExploreOpportunities(leadingCombination?.index)
                  }
                >
                  <span>Explore opportunities</span>
                  <span aria-hidden="true">→</span>
                </button>
              )}
            </>
          ) : (
            <div className={styles.detailHeader}>
              <div className={styles.nodeType}>Capacity Graph</div>
              <h3 className={styles.nodeName}>Select a node</h3>
              <p className={styles.evidence}>
                {mode === "demo" ? "Choose 2–3 spheres to combine capabilities and reveal a possible career direction." : "Choose any capacity to reveal its evidence and strongest commercial connections."}
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function focusCombination(
  elements: string[],
  nodes: CapacitySceneNode[],
  select: (id: string) => void,
) {
  const labels = new Set(
    elements.map((element) => element.toLocaleLowerCase()),
  );
  const node = nodes.find((candidate) =>
    labels.has(candidate.label.toLocaleLowerCase()),
  );
  if (node) select(node.id);
}

export function StaticCapacityGraph({ graph }: { graph: CapacityGraph }) {
  const grouped = graph.nodes.reduce<Record<string, typeof graph.nodes>>(
    (all, node) => ({ ...all, [node.type]: [...(all[node.type] ?? []), node] }),
    {},
  );
  return (
    <section className={styles.section} aria-label="Capacity Graph">
      <div className={styles.staticFallback}>
        <div className={styles.fallbackGroups}>
          {Object.entries(grouped).map(([type, nodes]) => (
            <div key={type} className={styles.fallbackGroup}>
              <div className={styles.kicker}>{type}</div>
              <div className={styles.fallbackNodes}>
                {nodes.map((node) => (
                  <span
                    key={node.id}
                    title={node.evidence[0]}
                    className={styles.fallbackNode}
                  >
                    {node.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

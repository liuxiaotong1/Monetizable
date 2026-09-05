"use client";

import { useEffect, useRef } from "react";
import type {
  CapacitySceneData,
  CapacitySceneNode,
} from "@/lib/capacity-graph-view";
import type { CapacityNodeType } from "@/lib/types";

interface CapacityGraphCanvasProps {
  scene: CapacitySceneData;
  selectedId?: string;
  selectedIds: string[];
  active: boolean;
  fullscreen: boolean;
  onReady(): void;
  onSelect(id: string): void;
  onClear(): void;
}

const colors: Record<CapacityNodeType, string> = {
  skill: "#d8a63d",
  domain: "#3976ba",
  industry: "#d4813a",
  language: "#8a63ba",
  tool: "#2d9ca4",
  experience: "#5869b4",
  strength: "#3b956b",
  interest: "#c96868",
  constraint: "#899096",
};

function idOf(value: string | CapacitySceneNode) {
  return typeof value === "string" ? value : value.id;
}

export function CapacityGraphCanvas({
  scene,
  selectedId,
  selectedIds,
  active,
  fullscreen,
  onReady,
  onSelect,
  onClear,
}: CapacityGraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    rotation: 0,
    tilt: -0.16,
    zoom: 1,
    dragging: false,
    moved: false,
    x: 0,
    y: 0,
  });
  const hitsRef = useRef<
    Array<{ id: string; x: number; y: number; radius: number }>
  >([]);
  const redrawRef = useRef<() => void>(() => undefined);
  const readyRef = useRef(false);
  const callbacksRef = useRef({ onReady, onSelect, onClear });
  callbacksRef.current = { onReady, onSelect, onClear };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let width = 0;
    let height = 0;
    let animation = 0;
    let last = performance.now();
    let lastAnimatedFrame = 0;
    const motionReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const selectedSet = new Set(selectedIds);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        fullscreen ? 1.6 : 1.35,
      );
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const projected = (node: CapacitySceneNode) => {
      const state = stateRef.current;
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const z = node.z ?? 0;
      const cos = Math.cos(state.rotation);
      const sin = Math.sin(state.rotation);
      const rx = x * cos - z * sin;
      const rz = x * sin + z * cos;
      const ty = y * Math.cos(state.tilt) - rz * Math.sin(state.tilt);
      const depth = rz * Math.cos(state.tilt) + y * Math.sin(state.tilt);
      const base = Math.min(width / 310, height / 205) * state.zoom;
      const perspective = Math.max(0.68, Math.min(1.35, 1 + depth / 430));
      return {
        x: width / 2 + rx * base * perspective,
        y: height / 2 + ty * base * perspective,
        depth,
        scale: base * perspective,
      };
    };

    const draw = (now: number) => {
      const elapsed = Math.min(40, now - last);
      last = now;
      if (active && !motionReduced && !selectedId && !stateRef.current.dragging)
        stateRef.current.rotation += elapsed * 0.000025;
      context.clearRect(0, 0, width, height);
      const background = context.createRadialGradient(
        width * 0.5,
        height * 0.48,
        0,
        width * 0.5,
        height * 0.48,
        Math.max(width, height) * 0.65,
      );
      background.addColorStop(0, "rgba(255,255,255,.98)");
      background.addColorStop(1, "rgba(246,244,239,.72)");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.save();
      context.strokeStyle = "rgba(110,105,96,.10)";
      context.lineWidth = 1;
      [0.42, 0.7, 0.94].forEach((factor) => {
        context.beginPath();
        context.ellipse(
          width / 2,
          height / 2,
          width * factor,
          height * factor * 0.34,
          -0.08,
          0,
          Math.PI * 2,
        );
        context.stroke();
      });
      context.restore();

      const points = new Map(
        scene.nodes.map((node) => [node.id, projected(node)]),
      );
      scene.links.forEach((link) => {
        const source = points.get(idOf(link.source));
        const target = points.get(idOf(link.target));
        if (!source || !target) return;
        context.beginPath();
        context.moveTo(source.x, source.y);
        context.lineTo(target.x, target.y);
        context.strokeStyle = "rgba(70,74,78,.055)";
        context.lineWidth = 0.45;
        context.stroke();
      });

      // A selection is a small path, not a highlighted copy of the whole graph.
      // Two capacities produce one connector; three produce two connectors.
      selectedIds.slice(1).forEach((id, index) => {
        const source = points.get(selectedIds[index]);
        const target = points.get(id);
        if (!source || !target) return;
        context.beginPath();
        context.moveTo(source.x, source.y);
        context.lineTo(target.x, target.y);
        context.strokeStyle = "rgba(190,137,32,.52)";
        context.lineWidth = 1.15;
        context.stroke();
      });

      const ordered = [...scene.nodes].sort(
        (a, b) =>
          (points.get(a.id)?.depth ?? 0) - (points.get(b.id)?.depth ?? 0),
      );
      const hits: typeof hitsRef.current = [];
      const labelCandidates: Array<{ node: CapacitySceneNode; x: number; y: number; radius: number; selected: boolean }> = [];
      ordered.forEach((node) => {
        const point = points.get(node.id)!;
        const selected = selectedSet.has(node.id);
        const dimmed = Boolean(selectedIds.length && !selected);
        const radius =
          Math.max(3, Math.min(13, (node.value + 2) * point.scale * 0.48)) *
          (selected ? 1.35 : 1);
        const color = colors[node.type];
        context.save();
        context.globalAlpha = dimmed ? 0.52 : 1;
        context.shadowColor = selected ? "#d5a133" : color;
        context.shadowBlur = selected ? 24 : 10;
        const sphere = context.createRadialGradient(
          point.x - radius * 0.32,
          point.y - radius * 0.38,
          radius * 0.08,
          point.x,
          point.y,
          radius,
        );
        sphere.addColorStop(0, "rgba(255,255,255,.94)");
        sphere.addColorStop(0.38, `${color}55`);
        sphere.addColorStop(1, `${color}aa`);
        context.fillStyle = sphere;
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fill();
        context.lineWidth = selected ? 2.2 : 0.65;
        context.strokeStyle = selected ? "#c7952f" : `${color}bb`;
        context.stroke();
        context.restore();
        if (selected || node.importance >= 10 || fullscreen)
          labelCandidates.push({ node, x: point.x, y: point.y, radius, selected });
        hits.push({
          id: node.id,
          x: point.x,
          y: point.y,
          radius: Math.max(12, radius + 5),
        });
      });
      const labelBoxes: Array<{ left: number; right: number; top: number; bottom: number }> = [];
      labelCandidates
        .sort((left, right) => Number(right.selected) - Number(left.selected) || right.node.importance - left.node.importance)
        .forEach(({ node, x, y, radius, selected }) => {
          const text = node.label.slice(0, 34);
          context.font = `${selected ? 700 : 600} ${selected ? 13 : 10.5}px -apple-system, BlinkMacSystemFont, sans-serif`;
          const width = Math.min(190, context.measureText(text).width + 10);
          const top = y + radius + 5;
          const box = { left: x - width / 2, right: x + width / 2, top, bottom: top + 17 };
          const collides = labelBoxes.some((existing) => !(box.right + 5 < existing.left || box.left - 5 > existing.right || box.bottom + 3 < existing.top || box.top - 3 > existing.bottom));
          if (collides && !selected) return;
          labelBoxes.push(box);
          context.fillStyle = selected ? "#5b3d08" : "rgba(9,9,9,.56)";
          context.textAlign = "center";
          context.fillText(text, x, y + radius + 15, 190);
        });
      hitsRef.current = hits;
      if (!readyRef.current) {
        readyRef.current = true;
        callbacksRef.current.onReady();
      }
    };

    resize();
    draw(performance.now());
    redrawRef.current = () => draw(performance.now());
    const observer = new ResizeObserver(() => {
      resize();
      redrawRef.current();
    });
    observer.observe(canvas);
    const animate = (now: number) => {
      if (now - lastAnimatedFrame >= 32) {
        lastAnimatedFrame = now;
        draw(now);
      }
      animation = requestAnimationFrame(animate);
    };
    if (active && !motionReduced) animation = requestAnimationFrame(animate);
    return () => {
      redrawRef.current = () => undefined;
      observer.disconnect();
      cancelAnimationFrame(animation);
    };
  }, [scene, selectedId, selectedIds, active, fullscreen]);

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const state = stateRef.current;
    state.dragging = true;
    state.moved = false;
    state.x = event.clientX;
    state.y = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const state = stateRef.current;
    if (!state.dragging) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) state.moved = true;
    state.rotation += dx * 0.006;
    state.tilt = Math.max(-0.65, Math.min(0.45, state.tilt + dy * 0.003));
    state.x = event.clientX;
    state.y = event.clientY;
    redrawRef.current();
  }

  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const state = stateRef.current;
    state.dragging = false;
    if (state.moved) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hit = [...hitsRef.current]
      .reverse()
      .find((node) => Math.hypot(node.x - x, node.y - y) <= node.radius);
    if (hit) callbacksRef.current.onSelect(hit.id);
    else callbacksRef.current.onClear();
  }

  function wheel(event: React.WheelEvent<HTMLCanvasElement>) {
    if (!fullscreen) return;
    event.preventDefault();
    stateRef.current.zoom = Math.max(
      0.72,
      Math.min(2.2, stateRef.current.zoom * (event.deltaY > 0 ? 0.92 : 1.08)),
    );
    redrawRef.current();
  }

  return (
    <canvas
      ref={canvasRef}
      aria-label="Interactive Capacity Graph"
      role="img"
      tabIndex={0}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={() => {
        stateRef.current.dragging = false;
      }}
      onWheel={wheel}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        touchAction: "pan-y",
      }}
    />
  );
}

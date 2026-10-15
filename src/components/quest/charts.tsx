"use client";
import {LocalizeTree} from '@/components/i18n/locale-provider';
import { useId, useState } from "react";
import type { HistoryPoint } from "@/lib/quest/types";
export function LineChart({
  values,
  color = "#b2ec93",
  height = 120,
  labels = false,
  locale = "zh",
}: {
  values: { date: string; value: number }[];
  color?: string;
  height?: number;
  labels?: boolean;
  locale?: "zh" | "en";
}) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  if (!values.length)
    return <LocalizeTree>{(
      <div className="chart-empty">
        {locale === "en" ? "Waiting for historical data" : "历史数据待同步"}
      </div>
    )}</LocalizeTree>;
  const points = values.filter((p) => Number.isFinite(p.value));
  if (!points.length)
    return <LocalizeTree>{(
      <div className="chart-empty">
        {locale === "en" ? "No verified observations" : "暂无有效数据"}
      </div>
    )}</LocalizeTree>;
  const width = 640,
    pad = labels ? 32 : 6,
    min = Math.min(...points.map((p) => p.value)),
    max = Math.max(...points.map((p) => p.value));
  const span = max - min || 1;
  const x = (i: number) =>
    pad + (i / Math.max(1, points.length - 1)) * (width - pad * 2);
  const y = (v: number) => height - 18 - ((v - min) / span) * (height - 36);
  const path = points
    .map(
      (p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`,
    )
    .join(" ");
  const area = `${path} L${x(points.length - 1)},${height - 8} L${pad},${height - 8} Z`;
  return <LocalizeTree>{(
    <div className="line-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={
          locale === "en"
            ? `Historical trend: ${points.length} observations, low ${min.toFixed(2)}, high ${max.toFixed(2)}`
            : `历史趋势，${points.length}个观测值，最低${min.toFixed(2)}，最高${max.toFixed(2)}`
        }
        onPointerMove={(e) => {
          const b = e.currentTarget.getBoundingClientRect();
          setHover(
            Math.max(
              0,
              Math.min(
                points.length - 1,
                Math.round(
                  ((e.clientX - b.left) / b.width) * (points.length - 1),
                ),
              ),
            ),
          );
        }}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.15, 0.5, 0.85].map((n) => (
          <line
            key={n}
            x1={pad}
            x2={width - pad}
            y1={height * n}
            y2={height * n}
            stroke="#ffffff"
            strokeOpacity=".06"
            strokeDasharray="3 5"
          />
        ))}
        <path d={area} fill={`url(#${uid})`} />
        <path
          d={path}
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {hover !== null && (
          <>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1="10"
              y2={height - 8}
              stroke={color}
              strokeOpacity=".4"
            />
            <circle
              cx={x(hover)}
              cy={y(points[hover].value)}
              r="4"
              fill={color}
            />
          </>
        )}
      </svg>
      <div className="chart-labels">
        <span>{points[0].date}</span>
        <span>
          {hover !== null
            ? `${points[hover].date} · ${points[hover].value.toFixed(2)}`
            : points[points.length - 1].date}
        </span>
      </div>
    </div>
  )}</LocalizeTree>;
}
export function MacroChart({
  history,
  unit,
}: {
  history: HistoryPoint[];
  unit: string;
}) {
  const [span, setSpan] = useState<"all" | "12">("all");
  return <LocalizeTree>{(
    <>
      <div className="chart-toolbar">
        <span>历史观察值 · {unit}</span>
        <div className="segmented">
          <button
            className={span === "all" ? "active" : ""}
            onClick={() => setSpan("all")}
          >
            5 年
          </button>
          <button
            className={span === "12" ? "active" : ""}
            onClick={() => setSpan("12")}
          >
            12 个观察值
          </button>
        </div>
      </div>
      <LineChart
        values={span === "12" ? history.slice(-12) : history}
        color="#b8a5f6"
        height={170}
        labels
      />
    </>
  )}</LocalizeTree>;
}

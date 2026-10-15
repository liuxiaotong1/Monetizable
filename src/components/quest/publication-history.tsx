import {LocalizeTree} from '@/components/i18n/locale-provider';
import { compactEventUnit } from "@/lib/quest/event-presentation";
import type { MarketEvent } from "@/lib/quest/types";
import { SourceLink, dualTime } from "./shared";

export function PublicationHistory({ event, mode }: { event: MarketEvent; mode: string }) {
  const records = event.releaseHistory ?? [];
  const dates = [...new Set(records.map(record => record.date))].sort().reverse().slice(0, 12);
  return <LocalizeTree>{<section className="publication-history">
    <h3>最近 12 次公布记录</h3>
    <p className="muted">已取得 {dates.length} 次官方公布。观察期与公布日期分别保存；尚未取得的历史记录不补造。{mode === "demo" ? "本工作区使用示例数据。" : ""}</p>
    {dates.length ? <div className="publication-list">{dates.map(date => {
      const versions = records.filter(record => record.date === date).sort((a, b) => a.version - b.version);
      const original = versions[0];
      const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(date);
      const displayDate = dateOnly ? date.replaceAll('-', '/') : new Date(date).toLocaleDateString("zh-CN", { timeZone: "America/New_York" });
      return <article className="publication-record" key={date}>
        <header><strong>{displayDate}</strong><small>{dateOnly ? '公布日期' : dualTime(date)} · 原始取得版本</small></header>
        <p>{original.period ? `${original.period} · ` : ""}公布 {original.actual}{compactEventUnit(event.unit)}{original.previous === undefined ? "" : ` · 前值 ${original.previous}${compactEventUnit(event.unit)}`}{original.revised === undefined ? "" : ` · 前值修订 ${original.revised}${compactEventUnit(event.unit)}`}</p>
        <SourceLink href={original.sourceUrl}>官方公布来源</SourceLink>
        {versions.length > 1 && <details><summary>后续取得的 {versions.length - 1} 个修订版本</summary>{versions.slice(1).map(record => <p key={record.version}>v{record.version} · {record.vintage} 取得 · 公布 {record.actual}{compactEventUnit(event.unit)}{record.revised === undefined ? "" : ` · 前值修订 ${record.revised}${compactEventUnit(event.unit)}`}</p>)}</details>}
      </article>;
    })}</div> : <p className="muted">等待取得官方公布结果后建立记录。</p>}
  </section>}</LocalizeTree>;
}

import type { MarketEvent } from "./types";

/** Keep measurement definitions in one place; repeated values only carry the scale. */
export function compactEventUnit(unit: string): string {
  if (unit.includes("%")) return "%";
  return unit.split(/[，,·]/)[0].trim();
}
export function eventTakeaway(event: MarketEvent, locale: "zh" | "en") {
  if (event.status !== "confirmed" || !Number.isFinite(event.actual)) return null;
  const en = locale === "en";
  const consensus = Number.isFinite(event.consensus);
  const baseline = consensus ? event.consensus : (event.revised ?? event.previous);
  if (!Number.isFinite(baseline)) return {
    arrow: "↔", tone: "mixed", title: en ? "Confirmed · comparison unavailable" : "结果已确认 · 暂无可比基准",
    detail: en ? "A matching consensus or previous value is needed before assigning a directional interpretation." : "尚无同口径共识或前值，暂不推断倾向。",
  };
  const difference = event.actual! - baseline!;
  const direction = Math.abs(difference) < 1e-8 ? 0 : difference > 0 ? 1 : -1;
  const arrow = direction > 0 ? "↑" : direction < 0 ? "↓" : "↔";
  const comparison = en
    ? `${direction > 0 ? "Above" : direction < 0 ? "Below" : "In line with"} ${consensus ? "consensus" : "the previous reading"}`
    : `${direction > 0 ? "高于" : direction < 0 ? "低于" : "持平"}${consensus ? "市场共识" : "前值"}`;
  const basis = consensus ? "" : en ? "No verified consensus; this compares with the previous reading. " : "未取得市场共识，仅比较前值。";
  let title = en ? "QQQ · mixed implications" : "QQQ · 影响偏混合";
  let detail = en ? "This reading alone does not establish a direction; combine it with rates, earnings and price confirmation." : "单项读数不足以确定方向，结合利率、盈利与价格确认。";
  let tone = "mixed";
  if (!direction) {
    title = en ? "No fresh directional edge" : "暂无新增方向优势";
    detail = en ? "The headline matches the comparison value; look at the breakdown and forward guidance." : "主指标与比较基准持平，继续看分项与前瞻指引。";
  } else if (["CPI", "PCE", "PPI", "FOMC"].includes(event.kind)) {
    const pressure = direction > 0;
    tone = pressure ? "pressure" : "support";
    title = en ? (pressure ? "QQQ · potential valuation pressure" : "QQQ · potential valuation relief") : (pressure ? "QQQ · 估值端偏承压" : "QQQ · 估值端偏支持");
    detail = event.kind === "FOMC"
      ? en ? "A higher/lower policy rate changes financing conditions; confirm with the statement, rate outlook and Treasury yields." : "政策利率变化影响融资条件，仍需结合声明、利率路径与美债收益率。"
      : en ? (pressure ? "Higher inflation can keep rate expectations elevated; confirm whether Treasury yields rise." : "Lower inflation may ease rate pressure; confirm whether Treasury yields fall.") : (pressure ? "通胀更热可能抬高利率预期，观察美债收益率是否同步走高。" : "通胀降温可能缓解利率压力，观察美债收益率是否同步回落。");
  } else if (["NFP", "JOLTS", "CLAIMS"].includes(event.kind)) {
    const stronger = event.kind === "CLAIMS" ? direction < 0 : direction > 0;
    title = en ? `Labor ${stronger ? "stronger" : "softer"} · QQQ mixed` : `就业${stronger ? "偏强" : "降温"} · QQQ 影响混合`;
    detail = en ? (stronger ? "Stronger labor supports growth but may delay rate cuts; watch yields and wage details." : "Softer labor may ease rate pressure but raises growth concerns; watch yields and earnings expectations.") : (stronger ? "就业偏强支持增长，但可能压低降息预期；观察收益率与工资分项。" : "就业降温可能缓解利率压力，也可能带来增长担忧；观察收益率与盈利预期。");
  } else if (["GDP", "ISM", "RETAIL", "CONFIDENCE"].includes(event.kind)) {
    title = en ? `Growth signal ${direction > 0 ? "stronger" : "softer"} · QQQ mixed` : `增长信号${direction > 0 ? "偏强" : "偏弱"} · QQQ 影响混合`;
    detail = en ? "Growth and rate expectations can pull in opposite directions; check earnings expectations and yields before assigning a trading bias." : "增长与利率预期可能拉向相反方向，结合盈利预期与收益率确认交易倾向。";
  }
  return { arrow, tone, title: `${comparison} · ${title}`, detail: `${basis}${detail}${en ? " This is a conditional interpretation, not an observed QQQ return." : "这是条件解读，不代表 QQQ 实际涨跌。"}` };
}

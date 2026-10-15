"use client";
import {LocalizeTree} from '@/components/i18n/locale-provider';
import { useState } from 'react';
import { investorStyles, styleOrder, styleQuestions, styleResult } from '@/lib/quest/investment-style';
import './investment-style.css';
import { shuffledIndices } from '@/lib/quest/shuffle';
export default function InvestmentStyle({ locale }: { locale: 'en' | 'zh' }) {
  const [started, setStarted] = useState(false), [answers, setAnswers] = useState<number[]>([]), [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [seed, setSeed] = useState('');
  const questionOrder = shuffledIndices(styleQuestions.length, seed);
  const questionIndex = questionOrder[step];
  const optionOrder = shuffledIndices(4, `${seed}:question:${questionIndex}`);
  const en = locale === 'en', result = completed ? styleResult(answers) : null, question = styleQuestions[questionIndex];
  const text = (zh: string, english: string) => en ? english : zh;
  function restart() { setSeed(crypto.randomUUID()); setAnswers([]); setStep(0); setCompleted(false); setStarted(true); }
  return <LocalizeTree>{<section className="style-quiz" aria-label={text('投资风格自测', 'Investing style quiz')}>
    <div className="style-quiz-heading"><span className="style-mascot" aria-hidden="true">🧬 🎮</span><div><span className="eyebrow">DISCOVER YOUR INVESTOR DNA</span><h2>{text('你的投资风格是什么？', 'What’s your investing style?')}</h2><p>{text('10 道偏好题，没有标准答案。认识自己的思考习惯，找到更合拍的学习路线。', '10 preference questions. No right answers. Explore how you think and discover a learning path that fits.')}</p></div></div>
    {!started ? <button className="primary" onClick={restart}>{text('开始自测 · 约 2 分钟', 'Take the quiz · about 2 minutes')} →</button> : result ? <div className="style-result" aria-live="polite">
      <span className="eyebrow">✨ {text('10 / 10 · 风格画像已解锁', '10 / 10 · Your profile unlocked')}</span>
      <h3>{result.leaders.length > 1 ? text('混合风格', 'A blended style') : investorStyles[result.leaders[0]].name[locale]}</h3>
      <div className="style-profiles">{result.leaders.map(style => <article key={style}><h4>{investorStyles[style].emoji} {investorStyles[style].name[locale]}</h4><p>{investorStyles[style].explanation[locale]}</p><strong>{text('下一条学习路线', 'Your next learning path')}</strong><p>{investorStyles[style].learning[locale]}</p><strong>{text('给自己的一个问题', 'A question to reflect on')}</strong><p>{investorStyles[style].reflection[locale]}</p></article>)}</div>
      <div className="style-breakdown">{styleOrder.map((style, index) => <div key={style}><span>{investorStyles[style].emoji} {investorStyles[style].name[locale]}</span><meter min={0} max={10} value={result.counts[index]} aria-label={investorStyles[style].name[locale]}/><small>{result.counts[index]} / 10</small></div>)}</div>
      <p className="style-note">{text('结果描述本次回答中的学习与判断偏好，不是风险承受能力评级；风格可以混合，也会随经验改变。', 'This describes the learning and decision preferences in your answers, rather than a risk-tolerance rating. Styles can blend and change with experience.')}</p>
      <button className="secondary" onClick={restart}>{text('重新测试', 'Retake quiz')} ↻</button>
    </div> : <div className="style-question">
      <div className="style-question-progress"><span>{text('探索进度', 'Discovery progress')} · {step + 1} / 10</span><progress max={10} value={step} aria-label={text('自测进度', 'Quiz progress')}/></div>
      <h3>{question.question[locale]}</h3>
      <div className="style-options">{optionOrder.map((originalIndex, index) => <button key={originalIndex} className={answers[step] === originalIndex ? 'selected' : ''} aria-pressed={answers[step] === originalIndex} onClick={() => setAnswers(previous => [...previous.slice(0, step), originalIndex, ...previous.slice(step + 1)])}><span>{String.fromCharCode(65 + index)}</span>{question.choices[originalIndex][locale]}</button>)}</div>
      <div className="style-actions"><button className="secondary" disabled={step === 0} onClick={() => setStep(value => value - 1)}>← {text('上一题', 'Back')}</button><button className="primary" disabled={answers[step] === undefined} onClick={() => { if (step < 9) setStep(value => value + 1); else setCompleted(true); }}>{step === 9 ? text('查看画像', 'See my profile') : text('下一题', 'Next')} →</button></div>
    </div>}
  </section>}</LocalizeTree>;
}

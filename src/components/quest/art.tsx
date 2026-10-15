import {LocalizeTree} from '@/components/i18n/locale-provider';
export function QuestArt({ small = false }: { small?: boolean }) {
  return <LocalizeTree>{<svg className={small ? "quest-art small" : "quest-art"} viewBox="0 0 520 310" fill="none" role="img" aria-label="背着书包的星际研究员，站在浮岛上观察市场星图">
    <defs><linearGradient id="island" x1="210" y1="211" x2="320" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="#3e5965"/><stop offset="1" stopColor="#172432"/></linearGradient><linearGradient id="cape" x1="260" y1="160" x2="322" y2="224"><stop stopColor="#b7dff1"/><stop offset="1" stopColor="#5d8bba"/></linearGradient><radialGradient id="orb"><stop stopColor="#c7fab6" stopOpacity=".38"/><stop offset="1" stopColor="#94b8ec" stopOpacity="0"/></radialGradient></defs>
    <circle cx="330" cy="150" r="140" fill="url(#orb)"/><ellipse cx="309" cy="274" rx="142" ry="10" fill="#020a17" opacity=".24"/>
    <path d="m130 210 47-29 44 20-40 32z" fill="#394958"/><path d="m130 210 51 23 19 24-46-13z" fill="#192d41"/><path d="m181 233 40-32-21 56z" fill="#304259"/><path d="m178 171 15-8 4 28-19 10z" fill="#e0cf94"/><path d="m178 171 10 8v24l-10-3z" fill="#827958"/>
    <path d="m210 216 65-41 142 39-58 51-103-12z" fill="#526767"/><path d="m210 216 46 37 103 12-42 40-66-39z" fill="url(#island)"/><path d="m359 265 58-51-32 59-68 32z" fill="#253847"/><path d="m214 216 63-32 116 31-37 31-97-8z" fill="#678074"/><path d="m214 216 39 17 5 18-24-14z" fill="#a1b395"/>
    <path d="m324 194 54-16 14 31-62 15z" fill="#485663"/><path d="m331 188 4-39 16-21 10 34-8 29z" fill="#89c4bf"/><path d="m351 128 10 34-8 29-9-20z" fill="#498d91"/>
    <path d="m270 211-6 20h17l5-20m23-5 9 23h-16l-7-18" fill="#17262f"/>
    <path d="m281 152-31 58 36 13 42-17-28-54z" fill="url(#cape)"/><path d="m272 176-23 16 4 13 27-15" fill="#7daccc"/><path d="m305 165 27 14-8 17-27-8" fill="#c2dfeb"/><path d="m324 178 10 9-7 10-9-6" fill="#ead6be"/>
    <path d="m286 176 20 3 11 29-29 3-11-28z" fill="#426380"/><path d="m294 183 12 2 7 18-18 2z" fill="#a9ccbc"/>
    <path d="m254 119 4-28 24 14 27-10 14 20 2 29-20 19-30-3-21-20z" fill="#d9e7e2"/><path d="m258 91 16 26-18 7zm51 4-6 25 21-5z" fill="#8dafb5"/><path d="m263 126 19-5 5 19-17 7z" fill="#213b4b"/><path d="m292 122 19 0 6 19-20 8z" fill="#213b4b"/><ellipse cx="277" cy="133" rx="4" ry="6" fill="#c2f49d"/><ellipse cx="303" cy="134" rx="4" ry="6" fill="#c2f49d"/><path d="m284 145 9-1-5 8z" fill="#e0b970"/>
    <path d="m267 107 8-16 27-2 15 12-13 9-20 4z" fill="#31506c"/><path d="m275 91 13-4 10 10-16 7z" fill="#89b5c7"/>
    <path d="m345 58 46-11 8 67-47 12z" fill="#a0b7d4" fillOpacity=".1" stroke="#94b1cd" strokeOpacity=".45"/><path d="m355 105 8-18 8 6 9-22 8-8" stroke="#b7ecab" strokeWidth="3" strokeLinecap="round"/><circle cx="391" cy="47" r="4" fill="#b7ecab"/>
    <path d="m124 66 11 7-1 13-11-7z" stroke="#9da8d5"/><path d="m432 155 11 7-1 13-11-7z" stroke="#9da8d5"/>
    <path d="M222 51v11m-5-5h10M434 76v9m-4-5h8M197 126v8m-4-4h8" stroke="#adb9d9" strokeLinecap="round"/>
    <circle cx="160" cy="117" r="2" fill="#96a2c5"/><circle cx="371" cy="29" r="2" fill="#96a2c5"/><circle cx="462" cy="131" r="2" fill="#96a2c5"/><path d="M115 147c26-51 92-86 165-96" stroke="#627891" strokeDasharray="3 9" opacity=".4"/>
  </svg>}</LocalizeTree>;
}

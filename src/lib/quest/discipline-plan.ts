export const disciplineRules=['reason','condition','review'] as const;
export type DisciplineRule=typeof disciplineRules[number];
export type DisciplinePlan={system:string;rules:DisciplineRule[];custom:string;since:string};
export function validateDiscipline(value:unknown):Omit<DisciplinePlan,'since'>|null{
 if(!value||typeof value!=='object')return null;
 const v=value as Record<string,unknown>;
 if(typeof v.system!=='string'||v.system.trim().length<3||v.system.length>500||typeof v.custom!=='string'||v.custom.length>1000||!Array.isArray(v.rules)||!v.rules.length||v.rules.some(r=>!disciplineRules.includes(r)))return null;
 return {system:v.system.trim(),custom:v.custom.trim(),rules:[...new Set(v.rules)] as DisciplineRule[]};
}

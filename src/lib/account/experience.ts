/** Temporary public free-experience phase. Set false to restore normal plan gates. */
export const OPEN_EXPERIENCE = true;
export function experienceAccess(user:{id:string}|null|undefined,admin=false,hasSubscription=false){
 return {premium:true,openExperience:true,signedIn:!!user,admin,status:'open-access',remaining:0,configured:hasSubscription,hasSubscription,trialUsed:false};
}

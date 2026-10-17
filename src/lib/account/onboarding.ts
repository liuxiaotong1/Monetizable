export type AdventureStage = 'landing' | 'tutorial' | 'home';
export type Companion = 'supercharlie' | 'female';
export function companion(value: unknown): Companion | null {
 return value === 'supercharlie' || value === 'female' ? value : null;
}
export function onboardingDestination(hero: Companion) {
 return `/?view=today&onboarding=1&hero=${hero}`;
}
export function onboardingStage(signedIn: boolean, completed: boolean, hero: Companion | null): AdventureStage {
 if (!signedIn) return 'landing';
 if (completed) return 'home';
 return hero ? 'tutorial' : 'landing';
}
export function tutorialKey(userId: string) { return `quest-tutorial:${userId}:v1`; }
export function victoryKey(userId: string) { return `quest-tutorial-victory:${userId}:v3`; }
export const pendingOnboardingKey = 'monetizable-pending-onboarding:v3';

import assert from 'node:assert/strict';
import {companion,onboardingDestination,onboardingStage,tutorialKey,victoryKey} from '../src/lib/account/onboarding';
import {loginDestination} from '../src/lib/account/redirect';
for (const hero of [null,'female','supercharlie'] as const) {
 for(const completed of [false,true]) assert.equal(onboardingStage(false,completed,hero),'landing','Guests always see free play, including browsers with old progress.');
 assert.equal(onboardingStage(true,true,hero),'home','Completed accounts return to their quest.');
}
assert.equal(onboardingStage(true,false,null),'landing');
for(const hero of ['female','supercharlie'] as const){
 assert.equal(onboardingStage(true,false,hero),'tutorial');
 const next=loginDestination(onboardingDestination(hero));
 const url=new URL(next,'https://getmonetizable.com');
 assert.equal(url.searchParams.get('onboarding'),'1');
 assert.equal(companion(url.searchParams.get('hero')),hero);
}
for(const invalid of [undefined,null,'yelan','admin','../female',1]) assert.equal(companion(invalid),null);
for(const invalid of ['https://evil.example','//evil.example','/\\evil.example','/\n/evil.example']) assert.equal(loginDestination(invalid),'/');
assert.notEqual(tutorialKey('account-a'),tutorialKey('account-b'));
assert.notEqual(victoryKey('account-a'),victoryKey('account-b'));
console.log('Onboarding regression checks passed: guest gate, returning accounts, companion continuation, account isolation and safe redirects.');

// Runs entirely inside a rollback transaction; no test accounts remain.
const fs = require('node:fs');
const assert = require('node:assert/strict');
process.loadEnvFile('.env.production.local');
const { Client } = require(process.env.PG_TEST_MODULE);
async function main() {
  const caResponse = await fetch('https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt');
  assert.equal(caResponse.ok,true);
  const url=new URL(process.env.POSTGRES_URL_NON_POOLING);url.searchParams.delete('sslmode');
  const c=new Client({connectionString:url.toString(),ssl:{ca:await caResponse.text(),rejectUnauthorized:true},connectionTimeoutMillis:10000});
  await c.connect();
  try {
    await c.query('begin');
    if(process.argv.includes('--migration')) {
      await c.query(fs.readFileSync('supabase/migrations/20260911200000_profile_submissions.sql','utf8'));
      await c.query(fs.readFileSync('supabase/migrations/20260912010000_account_usage.sql','utf8'));
    }
    const user=crypto.randomUUID(), profile=crypto.randomUUID();
    await c.query('insert into auth.users(id) values($1)',[user]);
    // Clone only in the rollback transaction, never log profile data.
    const original=(await c.query('select to_jsonb(p) as row from candidate_profiles p limit 1')).rows[0].row;
    const row={...original,id:profile,user_id:user,profile_fingerprint:crypto.randomUUID()};
    await c.query('insert into candidate_profiles select * from jsonb_populate_record(null::candidate_profiles,$1::jsonb)',[JSON.stringify(row)]);
    const reserve=async id=>(await c.query('select reserve_analysis($1,$2) as result',[user,id])).rows[0].result;
    const first=crypto.randomUUID(),second=crypto.randomUUID(),third=crypto.randomUUID();
    assert.equal(await reserve(first),'reserved');assert.equal(await reserve(first),'processing');
    assert.equal(await reserve(second),'reserved');assert.equal(await reserve(third),'payment_required');
    await c.query("update account_usage_events set status='failed' where id=$1",[second]);
    assert.equal(await reserve(third),'reserved');
    await c.query("update account_usage_events set status='complete' where user_id=$1 and status='reserved'",[user]);
    assert.equal(await reserve(first),'complete');assert.equal(await reserve(crypto.randomUUID()),'payment_required');
    const direction=async values=>(await c.query('select save_account_direction($1,$2,null,$3) as result',[user,profile,values])).rows[0].result;
    assert.ok((await direction(['Sales','Marketing'])).onboarding);
    assert.ok((await direction(['Marketing','Sales'])).onboarding);
    assert.ok((await direction(['Finance','Communication'])).onboarding);
    assert.ok((await direction(['Data','Operations'])).onboarding);
    assert.equal((await direction(['Brand','Research'])).error,'payment_required');
    await c.query("update agent_onboarding set intent_capabilities='{}' where user_id=$1",[user]);
    assert.equal((await direction(['Brand','Research'])).error,'payment_required','Resetting onboarding must not reset the allowance');
    assert.deepEqual((await direction(['Data','Operations'])).onboarding.intent_capabilities,['Data','Operations'],'Restoring the same paid-activation direction must restore the actual selection');
    assert.equal(Number((await c.query("select count(*) from account_usage_events where user_id=$1 and kind='direction'",[user])).rows[0].count),2);
    const foreign=crypto.randomUUID();await c.query('insert into auth.users(id) values($1)',[foreign]);
    assert.equal((await c.query('select reserve_analysis($1,$2) as result',[foreign,first])).rows[0].result,'forbidden');
    assert.equal((await c.query('select save_account_direction($1,$2,null,$3) as result',[foreign,profile,['Sales']])).rows[0].result.error,'forbidden');
    console.log('PASS: two-use limit, in-flight reservations, failed retry, completed idempotency, two direction changes, reordering, account isolation.');
  } finally {await c.query('rollback');await c.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

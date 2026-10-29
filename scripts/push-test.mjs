// Sends one test reminder to a single account. Requires a scheduler token and that account's user id.
const category = process.argv[2] || "premarket";
const phase = process.argv[3];
const token = process.env.CRON_SECRET || process.env.QUEST_REPORT_TOKEN;
const userId = process.env.PUSH_TEST_USER_ID;
const site = process.env.MONETIZABLE_SITE || "https://getmonetizable.com";
if (!token || !userId) {
  console.error("Set CRON_SECRET (or QUEST_REPORT_TOKEN) and PUSH_TEST_USER_ID. Categories: premarket, review, knowledge, event. Event phase: eve or soon.");
  process.exit(1);
}
const response = await fetch(site + "/api/push/test", {
  method: "POST",
  headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
  body: JSON.stringify({ category, phase, userId }),
});
const body = await response.text();
console.log(response.status, body);
if (!response.ok) process.exit(1);

// zai-usage.ts

const apiKey = process.env.ZAI_API_KEY;

if (!apiKey) {
  console.error("Missing ZAI_API_KEY");
  process.exit(1);
}

const response = await fetch(
  "https://api.z.ai/api/monitor/usage/quota/limit",
  {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  }
);

if (!response.ok) {
  console.error(`Request failed: ${response.status} ${response.statusText}`);
  process.exit(1);
}

const data = await response.json();

const limit = data.data?.limits?.find(
  (item: any) =>
    item.type === "TOKENS_LIMIT" &&
    item.unit === 3 &&
    item.number === 5
);

if (!limit) {
  console.error("5-hour usage limit not found");
  process.exit(1);
}

const resetAt = new Date(limit.nextResetTime);
const remainingMs = resetAt.getTime() - Date.now();

const hours = Math.floor(remainingMs / 3_600_000);
const minutes = Math.floor((remainingMs % 3_600_000) / 60_000);

console.log(`5-hour usage: ${limit.percentage}%`);
console.log(`Used: ${limit.currentValue.toLocaleString()} / ${limit.usage.toLocaleString()}`);
console.log(`Remaining: ${limit.remaining.toLocaleString()}`);
console.log(`Resets at: ${resetAt.toLocaleString()}`);
console.log(`Resets in: ${hours}h ${minutes}m`);
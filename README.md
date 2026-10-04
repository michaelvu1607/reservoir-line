# Reservoir Line

Satellite radar altimeters measure how high the water is in hundreds of the world’s large lakes. Reservoir Line ranks the ones that have fallen farthest below their own average and can draw that shoreline with Grok Imagine.

## Run

```bash
bun install
bun dev
```

Open http://localhost:3000. The first load downloads NASA’s 10-day catalog and the height records for the low lakes, then caches them for six hours.

## Grok Imagine

1. Create an API key at https://console.x.ai and add a payment method.
2. Copy `.env.example` to `.env.local` and set `XAI_API_KEY`.
3. Restart `bun dev`.
4. Press **Draw the waterline**. That makes two `grok-imagine-image` calls, about $0.02 each. Nothing is generated on page load.

## What the numbers mean

Heights are meters relative to one reference satellite pass, not elevation above sea level. NASA’s class compares each lake with its own history. A low reading can be drought, water use, or a dam. The satellite measures the drop. It does not by itself say why.

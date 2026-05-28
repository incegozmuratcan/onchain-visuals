#!/usr/bin/env node
const res = await fetch(`http://localhost:${process.env.PORT || 3000}/api/admin/onchain/refresh-all`, { method:'POST', headers: process.env.ONCHAIN_REFRESH_SECRET ? { authorization:`Bearer ${process.env.ONCHAIN_REFRESH_SECRET}` } : {} });
console.log(JSON.stringify(await res.json(), null, 2));
process.exit(res.ok ? 0 : 1);

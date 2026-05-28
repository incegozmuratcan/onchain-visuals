#!/usr/bin/env node
console.log('Binance liquidation collector scaffold: run this as a long-lived worker with ENABLE_BINANCE_LIQUIDATION_PULSE=1 and persist forceOrder events into onchain_chart_snapshots. It is intentionally not started from page/API requests.');
console.log('WebSocket endpoint: wss://fstream.binance.com/ws/!forceOrder@arr');

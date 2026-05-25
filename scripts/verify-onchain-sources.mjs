const required = ['DUNE_API_KEY','DUNE_STABLECOIN_NET_TRANSFERS_QUERY_ID'];
for (const k of required) console.log(`${k}=${process.env[k] ? 'set' : 'missing'}`);

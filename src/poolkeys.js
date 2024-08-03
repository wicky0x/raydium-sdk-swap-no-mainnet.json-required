const { LIQUIDITY_STATE_LAYOUT_V4, MARKET_STATE_LAYOUT_V3, SWAP_LAYOUT, OPEN_ORDERS_LAYOUT } = require('@raydium-io/raydium-sdk');
const { PublicKey, Connection } = require('@solana/web3.js');
const bs58 = require('bs58');
  
  const client = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  
  const RAY_V4 = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
  const RAY_AUTHORITY_V4 = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1";
  
  async function fetchPoolKeys(pairAddress) {
      try {
          const ammId = new PublicKey(pairAddress);
          const ammData = (await client.getParsedAccountInfo(ammId)).value.data;
          const ammDataDecoded = LIQUIDITY_STATE_LAYOUT_V4.decode(ammData);          
          const programId = new PublicKey(ammDataDecoded.marketProgramId);
          const marketId = new PublicKey(ammDataDecoded.marketId);
          const marketInfo = (await client.getParsedAccountInfo(marketId)).value.data;
          const marketDecoded = MARKET_STATE_LAYOUT_V3.decode(marketInfo);

          // console.log("AMM Data", ammDataDecoded);
          // console.log("Market Data", marketDecoded);
          
          //Fetch market authority
        const associatedAuthority = getAssociatedAuthority(programId, marketId);

          function getAssociatedAuthority(programId, marketId) {

            const seeds = [marketId.toBuffer()];
          
            let nonce = 0;
            let publicKey;
          
            while (nonce < 100) {
              try {
                const seedsWithNonce = seeds.concat(Buffer.from([nonce]), Buffer.alloc(7));
                publicKey = PublicKey.createProgramAddressSync(seedsWithNonce, programId);
              } catch (err) {
                if (err instanceof TypeError) {
                  throw err;
                }
                nonce++;
                continue;
              }
              return { publicKey, nonce };
            }
          
            return console.log('unable to find a viable program address nonce', 'params', {
              programId,
              marketId,
            });
          }

          const poolKeys = [{
              "id": ammId.toBase58(),
              "baseMint": marketDecoded.baseMint.toBase58(),
              "quoteMint": marketDecoded.quoteMint.toBase58(),
              "lpMint": ammDataDecoded.lpMint.toBase58(),
              "baseDecimals": Number(ammDataDecoded.baseDecimal),
              "quoteDecimals": Number(ammDataDecoded.quoteDecimal),
              "lpDecimals": Number(ammDataDecoded.baseDecimal),
              "version": 4,
              "programId": RAY_V4,
              "authority": RAY_AUTHORITY_V4,
              "openOrders": ammDataDecoded.openOrders.toBase58(),
              "targetOrders": ammDataDecoded.targetOrders.toBase58(),
              "baseVault": ammDataDecoded.baseVault.toBase58(),
              "quoteVault": ammDataDecoded.quoteVault.toBase58(),
              "withdrawQueue": ammDataDecoded.withdrawQueue.toBase58(),
              "lpVault": ammDataDecoded.lpVault.toBase58(),
              "marketVersion": ammDataDecoded.marketVersion || 4, // Assuming default version is 4 if not provided
              "marketProgramId": programId.toBase58(),
              "marketId": marketId.toBase58(),
              "marketAuthority": associatedAuthority?.publicKey.toBase58(),
              "marketBaseVault": marketDecoded.baseVault.toBase58(),
              "marketQuoteVault": marketDecoded.quoteVault.toBase58(),
              "marketBids": marketDecoded.bids.toBase58(),
              "marketAsks": marketDecoded.asks.toBase58(),
              "marketEventQueue": marketDecoded.eventQueue.toBase58()
          }];
  
          return poolKeys;

      } catch (error) {
          console.error(error);
          return null;
      }
  }
  
  module.exports = fetchPoolKeys;
  

  
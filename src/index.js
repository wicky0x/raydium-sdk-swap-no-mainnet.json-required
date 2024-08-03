const RaydiumSwap = require('./RaydiumSwap');
const { Transaction, VersionedTransaction } = require('@solana/web3.js');
const dotenv = require('dotenv')
dotenv.config();
const { encode } = require("bs58");
const fetchPoolKeys = require('./poolkeys');
const axios = require('axios');

/**
 * Performs a token swap on the Raydium protocol.
 * Depending on the configuration, it can execute the swap or simulate it.
 */

const swapConfig = {

  executeSwap: true, // Send tx when true, simulate tx when false
  useVersionedTransaction: true,
  tokenAAmount: 0.0001, // Swap 0.01 SOL for USDC in this example
  tokenAAddress: "So11111111111111111111111111111111111111112", // Solana Address
  tokenBAddress: "6qMpykXbykB199VM9iMcPnj18jbNFLanBzo294Ue4mLz", //  Token Address
  maxLamports: 1500000, // Micro lamports for priority fee
  direction: "in", // Swap direction: 'in' or 'out'
  liquidityFile: "trimmed_mainnet.json",
  maxRetries: 20

};

const swap = async () => {
  /**
   * The RaydiumSwap instance for handling swaps.
   */
  const raydiumSwap = new RaydiumSwap(process.env.RPC_URL, process.env.WALLET_PRIVATE_KEY);
  console.log(`Raydium swap initialized`);
  console.log(`Swapping ${swapConfig.tokenAAmount} of ${swapConfig.tokenAAddress} for ${swapConfig.tokenBAddress}...`)

  const config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `https://api.dexscreener.com/latest/dex/tokens/${swapConfig.tokenBAddress}`,
    headers: {
        'Accept': 'application/json'
      }
  };

  const response = await axios.request(config, { timeout: 300 });
  const { data } = response;

  const findSolPair = data.pairs.find(pairs => pairs.quoteToken.address === swapConfig.tokenAAddress);

  let lpAddy = findSolPair.pairAddress;

  const poolKeys = await fetchPoolKeys(lpAddy)

  /**
   * Load pool keys from the Raydium API to enable finding pool information.
   */
  await raydiumSwap.loadPoolKeys(poolKeys);
  console.log(`Loaded pool keys`);

  /**
   * Find pool information for the given token pair.
   */
  const poolInfo = raydiumSwap.findPoolInfoForTokens(swapConfig.tokenAAddress, swapConfig.tokenBAddress);
  if (!poolInfo) {
    console.error('Pool info not found');
    return 'Pool info not found';
  } else {
    console.log('Found pool info');
  }

  /**
   * Prepare the swap transaction with the given parameters.
   */
  const tx = await raydiumSwap.getSwapTransaction(
    swapConfig.tokenBAddress,
    swapConfig.tokenAAmount,
    poolInfo,
    swapConfig.maxLamports, 
    swapConfig.useVersionedTransaction,
    swapConfig.direction
  );

  /**
   * Depending on the configuration, execute or simulate the swap.
   */
  if (swapConfig.executeSwap) {
    /**
     * Send the transaction to the network and log the transaction ID.
     */
    const txid = swapConfig.useVersionedTransaction
      ? await raydiumSwap.sendVersionedTransaction(tx, swapConfig.maxRetries)
      : await raydiumSwap.sendLegacyTransaction(tx, swapConfig.maxRetries);
  
    console.log(`https://solscan.io/tx/${txid}`);
  
  } else {
    /**
     * Simulate the transaction and log the result.
     */
    const simRes = swapConfig.useVersionedTransaction
      ? await raydiumSwap.simulateVersionedTransaction(tx)
      : await raydiumSwap.simulateLegacyTransaction(tx);
  
    console.log(simRes);
  }
  
};

swap();


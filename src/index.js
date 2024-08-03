const RaydiumSwap = require('./RaydiumSwap');
const { Transaction, VersionedTransaction } = require('@solana/web3.js');
const dotenv = require('dotenv')
dotenv.config();
const { encode } = require("bs58");
const fetchPoolKeys = require('./poolkeys');

/**
 * Performs a token swap on the Raydium protocol.
 * Depending on the configuration, it can execute the swap or simulate it.
 */

const swapConfig = {

  executeSwap: true, // Send tx when true, simulate tx when false
  useVersionedTransaction: true,
  tokenAAmount: 0.0001, // Swap 0.01 SOL for USDC in this example
  tokenAAddress: "So11111111111111111111111111111111111111112", // Token to swap for the other, SOL in this case
  tokenBAddress: "4VepvRqCwQatUaEVoU2JsK9H4cWNj1fEvJ7anmsXUgP8", // USDC address
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

  const poolKeys = await fetchPoolKeys("5MPyNkgB5Sd2RnAbGo4x6qARkit4y2jacDsZtXNzUqPd")

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

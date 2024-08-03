const { Connection, PublicKey, Keypair, Transaction, VersionedTransaction, TransactionMessage } = require('@solana/web3.js');
const {
  Liquidity,
  LiquidityPoolKeys,
  jsonInfo2PoolKeys,
  LiquidityPoolJsonInfo,
  TokenAccount,
  Token,
  TokenAmount,
  TOKEN_PROGRAM_ID,
  Percent,
  SPL_ACCOUNT_LAYOUT,
} = require('@raydium-io/raydium-sdk');
const { Wallet } = require('@coral-xyz/anchor');
const bs58 = require('bs58');
const fs = require('fs');
const path = require('path');


class RaydiumSwap {
  constructor(RPC_URL, WALLET_PRIVATE_KEY) {
    this.connection = new Connection(RPC_URL, { commitment: 'confirmed' });
    this.wallet = new Wallet(Keypair.fromSecretKey(Uint8Array.from(bs58.decode(WALLET_PRIVATE_KEY))));
    this.allPoolKeysJson = [];
  }

  async loadPoolKeys(poolKeys) {

    console.log("Pool Keys", poolKeys[0])
    
    const liquidityJson = poolKeys;

    this.allPoolKeysJson = liquidityJson;
  }

  findPoolInfoForTokens(mintA, mintB) {
    const poolData = this.allPoolKeysJson.find(
      (i) => (i.baseMint === mintA && i.quoteMint === mintB) || (i.baseMint === mintB && i.quoteMint === mintA)
    );

    if (!poolData) return null;

    return jsonInfo2PoolKeys(poolData);
  }

  async getOwnerTokenAccounts() {
    const walletTokenAccount = await this.connection.getTokenAccountsByOwner(this.wallet.publicKey, {
      programId: TOKEN_PROGRAM_ID,
    });

    return walletTokenAccount.value.map((i) => ({
      pubkey: i.pubkey,
      programId: i.account.owner,
      accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
    }));
  }

/**
 * Builds a swap transaction.
 * @async
 * @param {string} toToken - The mint address of the token to receive.
 * @param {number} amount - The amount of the token to swap.
 * @param {Object} poolKeys - The liquidity pool keys.
 * @param {number} [maxLamports=100000] - The maximum lamports to use for transaction fees.
 * @param {boolean} [useVersionedTransaction=true] - Whether to use a versioned transaction.
 * @param {'in' | 'out'} [fixedSide='in'] - The fixed side of the swap ('in' or 'out').
 * @returns {Promise<Object>} The constructed swap transaction.
 */

async getSwapTransaction(
  toToken,
  // fromToken,
  amount,
  poolKeys,
  maxLamports = 100000,
  useVersionedTransaction = true,
  fixedSide = 'in'
) {
  const directionIn = poolKeys.quoteMint.toString() == toToken;
  const { minAmountOut, amountIn } = await this.calcAmountOut(poolKeys, amount, directionIn);
  console.log({ minAmountOut, amountIn });
  const userTokenAccounts = await this.getOwnerTokenAccounts();
  const swapTransaction = await Liquidity.makeSwapInstructionSimple({
    connection: this.connection,
    makeTxVersion: useVersionedTransaction ? 0 : 1,
    poolKeys: {
      ...poolKeys,
    },
    userKeys: {
      tokenAccounts: userTokenAccounts,
      owner: this.wallet.publicKey,
    },
    amountIn: amountIn,
    amountOut: minAmountOut,
    fixedSide: fixedSide,
    config: {
      bypassAssociatedCheck: false,
    },
    computeBudgetConfig: {
      microLamports: maxLamports,
    },
  });

  const recentBlockhashForSwap = await this.connection.getLatestBlockhash();
  const instructions = swapTransaction.innerTransactions[0].instructions.filter(Boolean);

  if (useVersionedTransaction) {
    const versionedTransaction = new VersionedTransaction(
      new TransactionMessage({
        payerKey: this.wallet.publicKey,
        recentBlockhash: recentBlockhashForSwap.blockhash,
        instructions: instructions,
      }).compileToV0Message()
    );

    versionedTransaction.sign([this.wallet.payer]);

    return versionedTransaction;
  }

  const legacyTransaction = new Transaction({
    blockhash: recentBlockhashForSwap.blockhash,
    lastValidBlockHeight: recentBlockhashForSwap.lastValidBlockHeight,
    feePayer: this.wallet.publicKey,
  });

  legacyTransaction.add(...instructions);

  return legacyTransaction;
}

/**
 * Sends a legacy transaction.
 * @async
 * @param {Object} tx - The transaction to send.
 * @returns {Promise<string>} The transaction ID.
 */
async sendLegacyTransaction(tx, maxRetries) {
  const txid = await this.connection.sendTransaction(tx, [this.wallet.payer], {
    skipPreflight: true,
    maxRetries: maxRetries,
  });

  return txid;
}

/**
 * Sends a versioned transaction.
 * @async
 * @param {Object} tx - The versioned transaction to send.
 * @returns {Promise<string>} The transaction ID.
 */
async sendVersionedTransaction(tx, maxRetries) {
  const txid = await this.connection.sendTransaction(tx, {
    skipPreflight: true,
    maxRetries: maxRetries,
  });

  return txid;
}

/**
 * Simulates a legacy transaction.
 * @async
 * @param {Object} tx - The legacy transaction to simulate.
 * @returns {Promise<any>} The simulation result.
 */
async simulateLegacyTransaction(tx) {
  const txid = await this.connection.simulateTransaction(tx, [this.wallet.payer]);

  return txid;
}

/**
 * Simulates a versioned transaction.
 * @async
 * @param {Object} tx - The versioned transaction to simulate.
 * @returns {Promise<any>} The simulation result.
 */
async simulateVersionedTransaction(tx) {
  const txid = await this.connection.simulateTransaction(tx);

  return txid;
}

/**
 * Gets a token account by owner and mint address.
 * @param {Object} mint - The mint address of the token.
 * @returns {Object} The token account.
 */
getTokenAccountByOwnerAndMint(mint) {
  return {
    programId: TOKEN_PROGRAM_ID,
    pubkey: PublicKey.default,
    accountInfo: {
      mint: mint,
      amount: 0,
    },
  };
}

/**
 * Calculates the amount out for a swap.
 * @async
 * @param {Object} poolKeys - The liquidity pool keys.
 * @param {number} rawAmountIn - The raw amount of the input token.
 * @param {boolean} swapInDirection - The direction of the swap (true for in, false for out).
 * @returns {Promise<Object>} The swap calculation result.
 */
async calcAmountOut(poolKeys, rawAmountIn, swapInDirection) {
  const poolInfo = await Liquidity.fetchInfo({ connection: this.connection, poolKeys });

  let currencyInMint = poolKeys.baseMint;
  let currencyInDecimals = poolInfo.baseDecimals;
  let currencyOutMint = poolKeys.quoteMint;
  let currencyOutDecimals = poolInfo.quoteDecimals;

  if (!swapInDirection) {
    currencyInMint = poolKeys.quoteMint;
    currencyInDecimals = poolInfo.quoteDecimals;
    currencyOutMint = poolKeys.baseMint;
    currencyOutDecimals = poolInfo.baseDecimals;
  }

  const currencyIn = new Token(TOKEN_PROGRAM_ID, currencyInMint, currencyInDecimals);
  const amountIn = new TokenAmount(currencyIn, rawAmountIn, false);
  const currencyOut = new Token(TOKEN_PROGRAM_ID, currencyOutMint, currencyOutDecimals);
  const slippage = new Percent(5, 100); // 5% slippage

  const { amountOut, minAmountOut, currentPrice, executionPrice, priceImpact, fee } = Liquidity.computeAmountOut({
    poolKeys,
    poolInfo,
    amountIn,
    currencyOut,
    slippage,
  });

  return {
    amountIn,
    amountOut,
    minAmountOut,
    currentPrice,
    executionPrice,
    priceImpact,
    fee,
  };
}
}

module.exports = RaydiumSwap
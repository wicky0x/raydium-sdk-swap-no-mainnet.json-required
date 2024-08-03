<p>
 <h3 align="center">Raydium SDK to swap tokens without downloading the long mainnet.json file</h3>
</p>

Create an .env file and pass your RPC_URL and WALLET_PRIVATE_KEY. 

# TLDR quick run

Set the tokenA and tokenB in `src/index.js swapConfig`. Also, you have to pass the lp address of the token pair to get the poolKeys. We are currently getting them by manually passing the lp address, but you get the LP address using dexscreener api and pass it to the fetchPoolKeys function param.

Sample DexScreener Endpoint: https://api.dexscreener.com/latest/dex/tokens/4VepvRqCwQatUaEVoU2JsK9H4cWNj1fEvJ7anmsXUgP8

Run the swap:

```
yarn swap
```

## Features

- Utilizes the Raydium SDK for interacting with the Solana blockchain.
- Supports both versioned and legacy transactions.
- Allows simulation of swap transactions before execution.
- Easy configuration for swap parameters through a dedicated config file.
- mainnet.json file not required

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js installed (v18 or above recommended)
- Yarn
- A Solana wallet with some SOL for testing the swap
- An environment file (.env) with your RPC URL and WALLET_PRIVATE_KEY


```

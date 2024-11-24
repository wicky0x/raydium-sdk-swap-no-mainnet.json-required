<p>
 <h3 align="left">Raydium SDK to swap tokens without downloading the long mainnet.json file</h3>
</p>

Create an .env file and pass your RPC_URL and WALLET_PRIVATE_KEY. 

Set the tokenA and tokenB in `src/index.js swapConfig`. 

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
Telegram: travis_bz
Discord: travis_bz

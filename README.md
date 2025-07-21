# 🌀 Universal Monad Bot

Automated transaction bot for interacting with Monad Testnet contracts.  
Supports multiple wallets, proxy rotation, randomized actions, and contract integrations such as WMON, Magma, and aPriori.

---

## ✨ Features

- ✅ Supports **multiple wallets**
- ✅ Proxy support via `https-proxy-agent`
- ✅ Customizable cycles and delays
- ✅ Auto wrap/unwrap WMON
- ✅ Stake/unstake 

---

## ⚙️ Installation

```bash
git clone https://github.com/bobokjp82/botMonad.git
cd botMonad
npm install prompts ethers colors https-proxy-agent
npm install
node universalBot.js

NOTE: 
List of private keys (one per line):
0xabc123...
0xdef456...

proxy formay di proxy.txt
username:password@123.45.67.89:8080
myuser:mypass@98.76.54.32:3128


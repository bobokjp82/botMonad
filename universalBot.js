const prompts = require("prompts");
const fs = require("fs");
const { ethers } = require("ethers");
const colors = require("colors");
const { HttpsProxyAgent } = require("https-proxy-agent");

const RPC_URL = "https://testnet-rpc.monad.xyz";
const EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";

const WMON_CONTRACT = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";
const USDC_CONTRACT = "0x5D876D73f4441D5f2438B1A3e2A51771B337F27A";
const MAGMA_CONTRACT = "0x2c9C959516e9AAEdB2C748224a41249202ca8BE7";
const APRIORI_CONTRACT = "0xb2f82D0f38dc453D596Ad40A37799446Cc89274A";

function getRandomAmount() {
  const min = 0.02, max = 0.05;
  return ethers.parseEther((Math.random() * (max - min) + min).toFixed(4));
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function createProvider(proxy, index) {
  if (proxy) {
    try {
      const agent = new HttpsProxyAgent("http://" + proxy);
      console.log(`[i] Wallet ${index + 1} menggunakan proxy: http://${proxy}`.gray);
      return new ethers.JsonRpcProvider({ url: RPC_URL, fetchOptions: { agent } });
    } catch {
      console.log(`[!] Proxy gagal dibuat, fallback tanpa proxy`.red);
    }
  }
  return new ethers.JsonRpcProvider(RPC_URL);
}

async function getTokenBalance(tokenAddress, wallet) {
  const abi = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
  const token = new ethers.Contract(tokenAddress, abi, wallet);
  const [balance, decimals] = await Promise.all([
    token.balanceOf(wallet.address),
    token.decimals()
  ]);
  return Number(ethers.formatUnits(balance, decimals)).toFixed(4);
}

async function showBalances(wallet) {
  const mon = await wallet.provider.getBalance(wallet.address);
  const wmon = await getTokenBalance(WMON_CONTRACT, wallet);
  const usdc = await getTokenBalance(USDC_CONTRACT, wallet);
  console.log(`\n[${wallet.address}]`.yellow);
  console.log(`MON:  ${ethers.formatEther(mon)} | WMON: ${wmon} | USDC: ${usdc}`.cyan);
}

async function rubicScript(wallet, times, delayMs) {
  const contract = new ethers.Contract(WMON_CONTRACT, [
    "function deposit() public payable",
    "function withdraw(uint256 amount) public"
  ], wallet);

  for (let i = 0; i < times; i++) {
    const amt = getRandomAmount();
    console.log(`\nCycle ${i + 1} of ${times}:`);
    try {
      console.log(`?? Wrapping ${ethers.formatEther(amt)} MON into WMON...`);
      const tx = await contract.deposit({ value: amt });
      console.log(`??  Wrap MON ? WMON successful`);
      console.log(`??  Transaction sent: ${EXPLORER_URL}${tx.hash}`);
      await tx.wait();
      await delay(delayMs);

      console.log(`?? Unwrapping ${ethers.formatEther(amt)} WMON back to MON...`);
      const tx2 = await contract.withdraw(amt);
      console.log(`??  Unwrap WMON ? MON successful`);
      console.log(`??  Transaction sent: ${EXPLORER_URL}${tx2.hash}`);
      await tx2.wait();
    } catch (e) {
      console.log(`[ERROR] ${wallet.address}: ${e.message}`.red);
    }
    await delay(delayMs);
  }
}

async function magmaScript(wallet, times, delayMs) {
  for (let i = 0; i < times; i++) {
    const amt = getRandomAmount();
    console.log(`\nCycle ${i + 1} of ${times}:`);
    try {
      console.log(`?? Staking ${ethers.formatEther(amt)} MON...`);
      const tx = await wallet.sendTransaction({
        to: MAGMA_CONTRACT,
        data: "0xd5575982",
        value: amt,
        gasLimit: 500000
      });
      console.log(`??  Transaction sent: ${EXPLORER_URL}${tx.hash}`);
      await tx.wait();

      await delay(delayMs);

      const unstakeData = "0x6fed1ea7" + ethers.toBeHex(amt, 32).substring(2);
      const tx2 = await wallet.sendTransaction({
        to: MAGMA_CONTRACT,
        data: unstakeData,
        gasLimit: 500000
      });
      console.log(`?? Unstake TX: ${EXPLORER_URL}${tx2.hash}`);
      await tx2.wait();
    } catch (err) {
      console.log(`[ERROR] ${wallet.address}: ${err.message}`.red);
    }
    await delay(delayMs);
  }
}

async function izumiScript(wallet, times, delayMs) {
  await rubicScript(wallet, times, delayMs);
}

async function aprioriScript(wallet, times, delayMs) {
  for (let i = 0; i < times; i++) {
    const amt = getRandomAmount();
    console.log(`\nCycle ${i + 1} of ${times}:`);
    const data = "0x6e553f65" +
      ethers.toBeHex(amt, 32).substring(2) +
      ethers.toBeHex(wallet.address, 32).substring(2);
    try {
      const tx = await wallet.sendTransaction({
        to: APRIORI_CONTRACT,
        data,
        value: amt,
        gasLimit: 500000
      });
      console.log(`?? Stake TX: ${EXPLORER_URL}${tx.hash}`);
      await tx.wait();
    } catch (err) {
      console.log(`[ERROR] ${wallet.address}: ${err.message}`.red);
    }
    await delay(delayMs);
  }
}

(async () => {
  console.clear();
  console.log("????????????????????????????????????????".green);
  console.log("?       Universal Monad Bot            ?".green);
  console.log("?       By Madeng Kasep ??             ?".green);
  console.log("????????????????????????????????????????\n".green);

  const keys = fs.readFileSync("pkevm.txt", "utf-8").split("\n").map(l => l.trim()).filter(Boolean);
  const proxies = fs.existsSync("proxy.txt") ? fs.readFileSync("proxy.txt", "utf-8").split("\n").map(p => p.trim()).filter(Boolean) : [];

  const { script } = await prompts({
    type: "select",
    name: "script",
    message: "Select the script to run:",
    choices: [
      { title: "Rubic Swap", value: "rubic" },
      { title: "Magma Stake", value: "magma" },
      { title: "Izumi Swap", value: "izumi" },
      { title: "aPriori Stake", value: "apriori" },
      { title: "Exit", value: "exit" }
    ]
  });
  if (script === "exit") return;

  const { cycles, delaySec } = await prompts([
    { type: "number", name: "cycles", message: "How many transactions per wallet?", initial: 1, min: 1 },
    { type: "number", name: "delaySec", message: "Delay between transactions (seconds)?", initial: 10, min: 0 }
  ]);

  for (let i = 0; i < keys.length; i++) {
    const pk = keys[i].trim();
    if (!pk || !/^0x[a-fA-F0-9]{64}$/.test(pk)) {
      console.log(`[!] Wallet ${i + 1} tidak valid, dilewati`.red);
      continue;
    }

    let provider;
    try {
      provider = createProvider(proxies[i], i);
    } catch {
      console.log(`[!] Proxy Wallet ${i + 1} gagal, fallback tanpa proxy`.red);
      provider = new ethers.JsonRpcProvider(RPC_URL);
    }

    let wallet;
    try {
      wallet = new ethers.Wallet(pk, provider);
    } catch {
      console.log(`[!] Wallet ${i + 1} gagal dibuat, dilewati`.red);
      continue;
    }

    console.log(`\nWallet ${i + 1}/${keys.length}`);
    await showBalances(wallet);

    if (script === "rubic") await rubicScript(wallet, cycles, delaySec * 1000);
    else if (script === "magma") await magmaScript(wallet, cycles, delaySec * 1000);
    else if (script === "izumi") await izumiScript(wallet, cycles, delaySec * 1000);
    else if (script === "apriori") await aprioriScript(wallet, cycles, delaySec * 1000);
  }

  console.log(`\n? Semua wallet selesai. Sampai jumpa lagi!\n`.green);
})();

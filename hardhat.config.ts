import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import "hardhat-contract-sizer";
import "hardhat-dependency-compiler";
import "hardhat-deploy";
import "solidity-coverage";

import * as dotenv from "dotenv";

import { HttpNetworkUserConfig } from "hardhat/types";
import { advanceTime } from "./scripts/advance_time";
import { createLiqPool } from "./scripts/dex/createLiqPool";
import { createNonWethPool } from "./scripts/dex/createNonWethPool";
import { distroUSDC } from "./scripts/distro_usdc";
import { createLPFarm } from "./scripts/farm/create_farm";
import { getBalance } from "./scripts/get_balance";
import { getUSDC } from "./scripts/get_usdc";
import { createAlphaPool } from "./scripts/gtm/create_alpha_pool";
import { pledge } from "./scripts/gtm/pledge";
import { unpledge } from "./scripts/gtm/unpledge";
import { withdrawAdmin } from "./scripts/gtm/withdraw_admin";
import { addressTester } from "./scripts/mev/address_tester";
import { deployPairFlash } from "./scripts/mev/deploy_pair_flash";
import { executeArbitrage } from "./scripts/mev/execute_arbitrage";
import { setRoute } from "./scripts/mev/set_route";
import { mintTokens } from "./scripts/mint_tokens";
import { addLiquidity } from "./scripts/protocol/add_liquidity";
import { borrow } from "./scripts/protocol/borrow";
import { burn } from "./scripts/protocol/burn";
import { createCreditPair } from "./scripts/protocol/create_credit_pair";
import { distributeCredit } from "./scripts/protocol/distribute_credit";
import { getPairFee } from "./scripts/protocol/get_pair_fee";
import { lend } from "./scripts/protocol/lend";
import { newLiquidity } from "./scripts/protocol/new_liquidity";
import { reimburse } from "./scripts/protocol/reimburse";
import { withdraw } from "./scripts/protocol/withdraw";
import { enableDistribution } from "./scripts/staking/enable_distribution";
import { performStakingActions } from "./scripts/staking/graph_staking_actions";
import { createSwapPair } from "./scripts/swap/create_swap_pool";
import { cpHold } from "./scripts/tokens/cp_hold";

dotenv.config();

const { GOERLI_ALCHEMY_PROJECT_ID, MAINNET_ALCHEMY_PROJECT_ID, TESTNET_PRIVATE_KEY, MAINNET_PRIVATE_KEY } = process.env;

createAlphaPool();
advanceTime();
getBalance();
pledge();
unpledge();
withdrawAdmin();
getUSDC();
createLPFarm();
distroUSDC();
createCreditPair();
newLiquidity();
createSwapPair();
distributeCredit();
addLiquidity();
lend();
borrow();
reimburse();
cpHold();
withdraw();
burn();
enableDistribution();
getPairFee();
performStakingActions();
deployPairFlash();
setRoute();
executeArbitrage();
addressTester();
createLiqPool();
mintTokens();
createNonWethPool();

const DEFAULT_MNEMONIC = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

const mainnetSharedNetworkConfig: HttpNetworkUserConfig = {};
if (MAINNET_PRIVATE_KEY) {
  mainnetSharedNetworkConfig.accounts = [MAINNET_PRIVATE_KEY];
} else {
  mainnetSharedNetworkConfig.accounts = {
    mnemonic: DEFAULT_MNEMONIC,
  };
}

const goerliSharedNetworkConfig: HttpNetworkUserConfig = {};
if (TESTNET_PRIVATE_KEY) {
  goerliSharedNetworkConfig.accounts = [TESTNET_PRIVATE_KEY];
} else {
  goerliSharedNetworkConfig.accounts = {
    mnemonic: DEFAULT_MNEMONIC,
  };
}

export default {
  allowUnlimitedContractSize: true,
  solidity: {
    version: "0.8.20",
    settings: {
      evmVersion: "paris",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  namedAccounts: {
    deployer: 0,
  },
  networks: {
    /*
    hardhat: {
      accounts: { accountsBalance: (1n << 256n).toString() },
      gas: 120000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000,
    },
    */
    hardhat: {
      // forking: {
      //   url: `https://eth-mainnet.g.alchemy.com/v2/${MAINNET_ALCHEMY_PROJECT_ID}`,
      //   blockNumber: 18542713,
      // },
      forking: {
        url: `https://arb-goerli.g.alchemy.com/v2/${GOERLI_ALCHEMY_PROJECT_ID}`,
        blockNumber: 55561103,
      },
    },
    goerli: {
      ...goerliSharedNetworkConfig,
      url: `https://arb-goerli.g.alchemy.com/v2/${GOERLI_ALCHEMY_PROJECT_ID}`,
      chainId: 421613,
      timeout: 18000000,
    },
    arbitrum: {
      ...mainnetSharedNetworkConfig,
      url: `https://arb-mainnet.g.alchemy.com/v2/${MAINNET_ALCHEMY_PROJECT_ID}`,
      chainId: 42161,
    },
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
    alwaysGenerateOverloads: true,
  },
  mocha: {
    timeout: 60000,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
  dependencyCompiler: {
    paths: ["@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol"],
    keep: true,
  },
};

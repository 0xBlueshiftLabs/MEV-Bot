import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const createNonWethPool: () => void = () => {
  task("createNonWethPool", "Create Swap LP")
    // .addParam("tokenA", "Address of first token")
    // .addParam("tokenB", "Address of second token")
    .addParam("amount0min", "The min tokenA amt")
    .addParam("amount1min", "The min tokenB amount")
    .addParam("swappoolid", "Swap pool id")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const [caller] = await hardhatRuntime.ethers.getSigners();
      console.log("Using the account:", caller.address);

      const DexRouter = await hardhatRuntime.deployments.get("DexRouter");
      const dexRouter = await hardhatRuntime.ethers.getContractAt(DexRouter.abi, DexRouter.address);

      const usdcDeployment = await hardhatRuntime.deployments.get(`USDC`);
      const usdc = await hardhatRuntime.ethers.getContractAt("ERC20PresetMinterPauser", usdcDeployment.address);

      const arbDeployment = await hardhatRuntime.deployments.get(`Arbitrum`);
      const arb = await hardhatRuntime.ethers.getContractAt("ERC20PresetMinterPauser", arbDeployment.address);

      const tokenA = usdc;
      const tokenB = arb;

      // const tokenA = await hardhatRuntime.ethers.getContractAt("ERC20PresetMinterPauser", taskArgs.tokenA.address);
      // const tokenB = await hardhatRuntime.ethers.getContractAt("ERC20PresetMinterPauser", taskArgs.tokenB.address);

      await tokenA.connect(caller).approve(dexRouter.address, hardhatRuntime.ethers.constants.MaxUint256);
      console.log("Approved TokenA");
      await tokenB.connect(caller).approve(dexRouter.address, hardhatRuntime.ethers.constants.MaxUint256);
      console.log("Approved TokenB");

      const currentBlock = await hardhatRuntime.ethers.provider.getBlock("latest");

      console.log(
        tokenA.address,
        tokenB.address,
        taskArgs.amount0min,
        taskArgs.amount1min,
        0,
        0,
        caller.address,
        currentBlock.timestamp + 1000
      );

      const tx = await dexRouter
        .connect(caller)
        .addLiquidity(
          tokenA.address,
          tokenB.address,
          taskArgs.amount0min,
          taskArgs.amount1min,
          0,
          0,
          caller.address,
          currentBlock.timestamp + 1000
        );

      await tx.wait();
      const DexFactory = await hardhatRuntime.deployments.get("DexFactory");
      const dexFactory = await hardhatRuntime.ethers.getContractAt(DexFactory.abi, DexFactory.address);
      // get CreditPairFactory abi
      const allPairsLength = await dexFactory.allPairsLength();
      const pairAddress = await dexFactory.allPairs(allPairsLength.toNumber() - 1);

      console.log("Pair address: ", pairAddress);

      hardhatRuntime.deployments.save(`SwapPair${taskArgs.swappoolid}`, { abi: [], address: pairAddress });
      console.log(`Liquidity pool created`);
    });
};
export { createNonWethPool };

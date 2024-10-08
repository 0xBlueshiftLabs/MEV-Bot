import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task, types } from "hardhat/config";

const createSwapPair: () => void = () => {
  task("createSwapPair", "Pledge to alpha pool")
    .addParam("tokenA", "Token A address")
    .addParam("tokenB", "Token B address")
    .addOptionalPositionalParam("stable", "Is stable pool", false, types.boolean)
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[0];
      console.log("Using the account:", caller.address);

      let swapFactoryAddress;
      if ((await hardhatRuntime.getChainId()) === "421613") {
        throw new Error("Unsupported operation for network");
      }

      swapFactoryAddress = "0xd158bd9e8b6efd3ca76830b66715aa2b7bad2218";

      const swapFactoryAbi = [
        "function createPair(address tokenA, address tokenB, bool isStable) external returns (address pair)",
        "function getPair(address tokenA, address tokenB, bool isStablr) external view returns (address pair)",
      ];

      const swapFactory = await hardhatRuntime.ethers.getContractAt(swapFactoryAbi, swapFactoryAddress);
      await swapFactory.connect(caller).createPair(taskArgs.tokenA, taskArgs.tokenB, taskArgs.stable);
      const pairAddress = await swapFactory.getPair(taskArgs.tokenA, taskArgs.tokenB, taskArgs.stable);
      console.log(`Swap pool created at ${pairAddress} for ${taskArgs.tokenA}/${taskArgs.tokenB}`);

      // deploying liquidity

      const router = [
        "function quoteAddLiquidity(address tokenA, address tokenB, bool isStable, uint256 amountADesired, uint256 amountBDesired) external view returns (uint256 amountA, uint256 amountB)",
        "function addLiquidity(address tokenA, address tokenB, bool isStable, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
        "function getReserves(address tokenA, address tokenB, bool stable) external view returns (uint reserveA, uint reserveB)",
      ];

      const routerAddress = "0x81C7EBbC66b5f9e1dB29C4C427Fe6339cc32D4eA";

      const routerContract = await hardhatRuntime.ethers.getContractAt(router, routerAddress);

      const amountADesired = hardhatRuntime.ethers.utils.parseUnits("1000", 6);
      const amountBDesired = hardhatRuntime.ethers.utils.parseUnits("1000", 18);

      // approve
      const tokenA = await hardhatRuntime.ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
        taskArgs.tokenA
      );
      const tokenB = await hardhatRuntime.ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
        taskArgs.tokenB
      );

      await tokenA.connect(caller).approve(routerAddress, amountADesired);
      await tokenB.connect(caller).approve(routerAddress, amountBDesired);

      // get current block timestamp
      const block = await hardhatRuntime.ethers.provider.getBlock("latest");
      const deadline = block.timestamp + 1000;

      await routerContract
        .connect(caller)
        .addLiquidity(
          taskArgs.tokenA,
          taskArgs.tokenB,
          taskArgs.stable,
          amountADesired,
          amountBDesired,
          0,
          0,
          caller.address,
          deadline
        );
    });
};
export { createSwapPair };

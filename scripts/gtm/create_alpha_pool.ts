import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const createAlphaPool: () => void = () => {
  task("createAlphaPool", "Create alpha pool")
    .addParam("tokenA", "The ERC20's address of the token A")
    .addParam("tokenB", "The ERC20's address of the token B")
    .addParam("maturity", "The alpha pool maturity in seconds")
    .addParam("allocationPoint", "The allocation point of the pool")
    .addParam("tokensToDistribute", "Array of token addresses to distirbute")
    .addParam("alphaPoolId", "The alpha pool id")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const { deployments } = hardhatRuntime;
      const [caller] = await hardhatRuntime.ethers.getSigners();
      console.log("Using the account:", caller.address);

      const alphaPoolFactoryDeployment = await hardhatRuntime.deployments.get("AlphaPoolFactory");
      const alphaPoolFactory = await hardhatRuntime.ethers.getContractAt(
        "AlphaPoolFactory",
        alphaPoolFactoryDeployment.address
      );

      const tokensToDistribute = JSON.parse(taskArgs.tokensToDistribute);

      const tx = await alphaPoolFactory.createAlphaPool(
        taskArgs.tokenA,
        taskArgs.tokenB,
        taskArgs.maturity,
        taskArgs.allocationPoint,
        tokensToDistribute
      );

      // get AlphaPoolCreated event
      const receipt = await tx.wait();
      const events = receipt.events;

      const alphaPoolCreatedEvent = events.find((e) => e.event === "AlphaPoolCreated");
      const alphaPoolAddress = alphaPoolCreatedEvent.args.alphaPool;

      deployments.save(`AlphaPool${taskArgs.alphaPoolId}`, { abi: [], address: alphaPoolAddress });

      console.log(`Alpha pool created at ${alphaPoolAddress} for ${taskArgs.tokenA}/${taskArgs.tokenB}`);
    });
};
export { createAlphaPool };

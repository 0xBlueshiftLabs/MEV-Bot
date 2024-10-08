import "@nomiclabs/hardhat-ethers";
import { ethers } from "ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const pledge: () => void = () => {
  task("pledge", "Pledge to alpha pool")
    .addParam("alphaPoolId", "The alpha pool id")
    .addParam("userId", "The uder id pledging")
    .addParam("amount", "The amount to pledge (in ETH)")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[taskArgs.userId];
      console.log("Using the account:", caller.address);

      const alphaPoolDeployment = await hardhatRuntime.deployments.get(`AlphaPool${taskArgs.alphaPoolId}`);
      const alphaPool = await hardhatRuntime.ethers.getContractAt("AlphaPool", alphaPoolDeployment.address);

      const amount = ethers.utils.parseEther(taskArgs.amount);

      await alphaPool.connect(caller).pledge({ value: amount });

      console.log(`Pledged ${taskArgs.amount} ETH to alpha pool ${taskArgs.alphaPoolId} for user ${caller.address}`);

      const currentPledge = await alphaPool.totalPledged();
      console.log(`Current pledge in pool: ${currentPledge.toString()}`);
    });
};
export { pledge };

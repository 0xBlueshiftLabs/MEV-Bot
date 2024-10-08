import "@nomiclabs/hardhat-ethers";
import { ethers } from "ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const withdrawAdmin: () => void = () => {
  task("withdrawAdmin", "Withdraw pledge from alpha pool")
    .addParam("alphaPoolId", "The alpha pool id")
    .addParam("amount", "The amount to pledge (in ETH)")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[0];
      console.log("Using the account:", caller.address);

      const alphaPoolDeployment = await hardhatRuntime.deployments.get(`AlphaPool${taskArgs.alphaPoolId}`);
      const alphaPool = await hardhatRuntime.ethers.getContractAt("AlphaPool", alphaPoolDeployment.address);

      const currentPledge = await alphaPool.totalPledged();
      console.log(`Current pledge: ${currentPledge.toString()}`);

      const amount = ethers.utils.parseEther(taskArgs.amount);

      await alphaPool.connect(caller).withdrawAdmin(caller.address, amount);

      console.log(`Withdrew ${taskArgs.amount} ETH from alpha pool ${taskArgs.alphaPoolId} for user ${caller.address}`);
    });
};
export { withdrawAdmin };

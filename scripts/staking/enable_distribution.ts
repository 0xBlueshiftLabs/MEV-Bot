import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const enableDistribution: () => void = () => {
  task("enableDistribution", "Enable a token into staking")
    .addParam("token", "token")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[0];
      console.log("Using the account:", caller.address);

      const creditTokenDeployment = await hardhatRuntime.deployments.get("CreditToken");

      const stakingDeployment = await hardhatRuntime.deployments.get("CreditStaking");
      const staking = await hardhatRuntime.ethers.getContractAt("CreditStaking", stakingDeployment.address);

      await staking.connect(caller).enableDistributedToken(creditTokenDeployment.address);

      console.log(`Token ${taskArgs.token} enabled into staking`);
    });
};
export { enableDistribution };

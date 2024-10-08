import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const performStakingActions: () => void = () => {
  task("performStakingActions", "Do multiple actions to test out the subgraph")
    .addParam("stakingepochseconds", "Total Seconds in an epoch")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[0];
      console.log("Using the account:", caller.address);

      const distributorDeployment = await hardhatRuntime.deployments.get("Distributor");
      const creditTokenDeployment = await hardhatRuntime.deployments.get("CreditToken");
      const stakingDeployment = await hardhatRuntime.deployments.get("CreditStaking");

      const staking = await hardhatRuntime.ethers.getContractAt("CreditStaking", stakingDeployment.address);
      const distributor = await hardhatRuntime.ethers.getContractAt("Distributor", distributorDeployment.address);
      const creditToken = await hardhatRuntime.ethers.getContractAt("CreditToken", creditTokenDeployment.address);

      await distributor.connect(caller).claimAllStakingCredit();

      await creditToken
        .connect(caller)
        .approve(staking.address, hardhatRuntime.ethers.utils.parseEther("100000000000"));
      await staking.connect(caller).stake(hardhatRuntime.ethers.utils.parseEther("1"));

      await hardhatRuntime.network.provider.send("evm_increaseTime", [Number(taskArgs.stakingepochseconds)]);
      await hardhatRuntime.network.provider.send("evm_mine");

      await staking.connect(caller).updateCurrentCycleStartTime();
      await staking.connect(caller).harvestDividends(creditToken.address, false);

      await creditToken
        .connect(caller)
        .approve(staking.address, hardhatRuntime.ethers.utils.parseEther("100000000000"));
      await staking.connect(caller).stake(hardhatRuntime.ethers.utils.parseEther("1"));

      await hardhatRuntime.network.provider.send("evm_increaseTime", [10]);
      await hardhatRuntime.network.provider.send("evm_mine");

      await hardhatRuntime.network.provider.send("evm_increaseTime", [Number(taskArgs.stakingepochseconds)]);
      await hardhatRuntime.network.provider.send("evm_mine");

      await hardhatRuntime.network.provider.send("evm_increaseTime", [10]);
      await hardhatRuntime.network.provider.send("evm_mine");
      await staking.connect(caller).massUpdateDividendsInfo();

      await staking.connect(caller).unstake(hardhatRuntime.ethers.utils.parseEther("0.5"));
    });
};
export { performStakingActions };

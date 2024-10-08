import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const getPairFee: () => void = () => {
  task("getPairFee", "Get staking and protocol fee")
    .addParam("poolId", "Pool id")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[0];
      console.log("Using the account:", caller.address);

      const creditPairDeployment = await hardhatRuntime.deployments.get(`CreditPair${taskArgs.poolId}`);
      const creditPair = await hardhatRuntime.ethers.getContractAt("CreditPair", creditPairDeployment.address);

      const stakingFee = await creditPair.stakingFeeStored();
      const protocolFee = await creditPair.protocolFeeStored();

      console.log("Staking fee:", stakingFee.toString());
      console.log("Protocol fee:", protocolFee.toString());
    });
};
export { getPairFee };

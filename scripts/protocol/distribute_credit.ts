import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task, types } from "hardhat/config";

const distributeCredit: () => void = () => {
  task("distributeCredit", "Call the distribute function from the Distributor contract")
    .addOptionalParam("duration", "Duration of vesting for team and treasury", 31560000, types.int)
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[0];
      console.log("Using the account:", caller.address);

      const DistributorDeployment = await hardhatRuntime.deployments.get("Distributor");
      const distributor = await hardhatRuntime.ethers.getContractAt("Distributor", DistributorDeployment.address);
      await distributor.connect(caller).distribute(taskArgs.duration);

      console.log("Done");
    });
};
export { distributeCredit };

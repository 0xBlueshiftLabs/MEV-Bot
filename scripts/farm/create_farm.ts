import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const createLPFarm: () => void = () => {
  task("create-lp-farm", "Create LP Farm")
    .addParam("pair", "The address of the pair")
    .addParam("maturity", "The pools maturity")
    .addParam("allocpoint", "The alloc point for the pool")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const [caller] = await hardhatRuntime.ethers.getSigners();
      console.log("Using the account:", caller.address);

      const LPFarmingDeployment = await hardhatRuntime.deployments.get("LPFarming");
      const lpFarming = await hardhatRuntime.ethers.getContractAt("LPFarming", LPFarmingDeployment.address);

      const tx = await lpFarming.connect(caller).addPool(taskArgs.allocpoint, taskArgs.pair, taskArgs.maturity);

      await tx.wait();

      console.log(`LPFarm created at ${taskArgs.pair}-${taskArgs.maturity} with allocPoint :  ${taskArgs.allocpoint}`);
    });
};
export { createLPFarm };

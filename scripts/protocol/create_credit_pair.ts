import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const createCreditPair: () => void = () => {
  task("createCreditPair", "Create credit pool")
    .addParam("asset", "The ERC20's address of the asset")
    .addParam("collateral", "The ERC20's address of the collateral")
    .addParam("poolId", "The pool id")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const { deployments } = hardhatRuntime;
      const [caller] = await hardhatRuntime.ethers.getSigners();
      console.log("Using the account:", caller.address);

      const CreditRouterDeployment = await hardhatRuntime.deployments.get("Router");
      const router = await hardhatRuntime.ethers.getContractAt("CreditRouter", CreditRouterDeployment.address);

      const tx = await router.connect(caller).deployPair({ asset: taskArgs.asset, collateral: taskArgs.collateral });

      // get CreatePair event
      const receipt = await tx.wait();
      const events = receipt.events;

      // get CreditPairFactory abi
      const factoryInterface = (await hardhatRuntime.ethers.getContractFactory("CreditFactory")).interface;
      const createPairEvent = factoryInterface.parseLog(events[2]);
      const pairAddress = createPairEvent.args.pair;

      deployments.save(`CreditPair${taskArgs.poolId}`, { abi: [], address: pairAddress });

      console.log(`CreditPair created at ${pairAddress} for ${taskArgs.asset}/${taskArgs.collateral}`);
    });
};
export { createCreditPair };

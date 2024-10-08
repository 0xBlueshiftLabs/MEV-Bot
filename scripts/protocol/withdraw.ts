import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const withdraw: () => void = () => {
  task("withdraw", "withdraw cp id to the pool")
    .addParam("userId", "User id")
    .addParam("poolId", "Pool id")
    .addParam("cpId", "cpId")
    .addParam("maturity", "Maturity in seconds")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[taskArgs.userId];
      console.log("Using the account:", caller.address);

      const creditPairDeployment = await hardhatRuntime.deployments.get(`CreditPair${taskArgs.poolId}`);
      const creditPair = await hardhatRuntime.ethers.getContractAt("CreditPair", creditPairDeployment.address);

      const cpDeployment = await hardhatRuntime.deployments.get(`CreditPosition`);
      const creditPosition = await hardhatRuntime.ethers.getContractAt("CreditPosition", cpDeployment.address);

      const CreditRouterDeployment = await hardhatRuntime.deployments.get("Router");
      const router = await hardhatRuntime.ethers.getContractAt("CreditRouter", CreditRouterDeployment.address);

      const assetAddress = await creditPair.asset();
      const creditPositionId = +taskArgs.cpId;
      const maturity = taskArgs.maturity;
      const to = caller.address; // admin
      // approve cp
      await creditPosition.connect(caller).approve(router.address, creditPositionId);

      const asset = await hardhatRuntime.ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
        assetAddress
      );
      console.log("Balance before", await asset.balanceOf(caller.address));

      await router.connect(caller).collectETHCollateral({
        asset: assetAddress,
        maturity,
        assetTo: to,
        collateralTo: to,
        creditPositionId,
      });

      console.log("Balance after", await asset.balanceOf(caller.address));

      console.log(`Withdraw ${creditPositionId} to ${creditPair.address} for ${maturity}`);
    });
};
export { withdraw };

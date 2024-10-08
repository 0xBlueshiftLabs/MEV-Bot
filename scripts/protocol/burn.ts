import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const burn: () => void = () => {
  task("burn", "burn cp id to the pool")
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
      const collateralAddress = await creditPair.collateral();
      const creditPositionId = +taskArgs.cpId;
      const maturity = taskArgs.maturity;
      const to = caller.address; // admin
      // approve cp
      await creditPosition.connect(caller).approve(router.address, creditPositionId);

      const asset = await hardhatRuntime.ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
        assetAddress
      );
      const collateral = await hardhatRuntime.ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
        collateralAddress
      );

      console.log("Asset balance before", await asset.balanceOf(caller.address));
      console.log("Collateral balance before", await collateral.balanceOf(caller.address));

      await router.connect(caller).removeLiquidityETHCollateral({
        asset: assetAddress,
        maturity,
        assetTo: to,
        collateralTo: to,
        creditPositionId,
      });

      console.log("Asset balance after", await asset.balanceOf(caller.address));
      console.log("Collateral balance after", await collateral.balanceOf(caller.address));

      console.log(`Burn LP ${creditPositionId} to ${creditPair.address} for ${maturity}`);
    });
};
export { burn };

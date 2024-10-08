import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const reimburse: () => void = () => {
  task("reimburse", "reimburse from the pool")
    .addParam("userId", "User id")
    .addParam("poolId", "Pool id")
    .addParam("cpId", "cpId")
    .addParam("assetOut", "Asset out")
    .addParam("maturity", "Maturity in seconds")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[taskArgs.userId];
      console.log("Using the account:", caller.address);
      const blockTimestamp = (await hardhatRuntime.ethers.provider.getBlock("latest")).timestamp;

      const creditPairDeployment = await hardhatRuntime.deployments.get(`CreditPair${taskArgs.poolId}`);
      const creditPair = await hardhatRuntime.ethers.getContractAt("CreditPair", creditPairDeployment.address);

      const cpDeployment = await hardhatRuntime.deployments.get(`CreditPosition`);
      const creditPosition = await hardhatRuntime.ethers.getContractAt("CreditPosition", cpDeployment.address);

      const CreditRouterDeployment = await hardhatRuntime.deployments.get("Router");
      const router = await hardhatRuntime.ethers.getContractAt("CreditRouter", CreditRouterDeployment.address);

      const assetAddress = await creditPair.asset();

      const asset = await hardhatRuntime.ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
        assetAddress
      );

      console.log("Balance before reimburse", await hardhatRuntime.ethers.provider.getBalance(caller.address));

      const assetDecimals = await asset.decimals();
      const assetOut = hardhatRuntime.ethers.utils.parseUnits(taskArgs.assetOut, assetDecimals);
      // approve
      await asset.connect(caller).approve(router.address, assetOut);

      const maturity = +taskArgs.maturity;
      const collateralTo = caller.address;
      const cpId = +taskArgs.cpId;
      const deadline = blockTimestamp + 3600; // now + 1h

      // approve cp
      await creditPosition.connect(caller).approve(router.address, cpId);

      await router.connect(caller).repayETHCollateral({
        asset: asset.address,
        maturity,
        collateralTo,
        creditPositionId: cpId,
        deadline,
      });

      console.log("Balance after reimburse", await hardhatRuntime.ethers.provider.getBalance(caller.address));

      console.log(`Reimbursed ${assetOut} to ${creditPair.address} for ${maturity}`);
    });
};
export { reimburse };

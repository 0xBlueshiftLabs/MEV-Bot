import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task, types } from "hardhat/config";

const borrow: () => void = () => {
  task("borrow", "Borrow from the pool")
    .addParam("userId", "User id")
    .addParam("poolId", "Pool id")
    .addOptionalParam("percent", "percent", 2 ** 31, types.int)
    .addParam("collateralIn", "collateralIn (in eth)")
    .addParam("assetOut", "Asset out")
    .addParam("maxDebt", "maxDebt")
    .addParam("maturity", "Maturity in seconds")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[taskArgs.userId];
      console.log("Using the account:", caller.address);
      const blockTimestamp = (await hardhatRuntime.ethers.provider.getBlock("latest")).timestamp;

      const creditPairDeployment = await hardhatRuntime.deployments.get(`CreditPair${taskArgs.poolId}`);
      const creditPair = await hardhatRuntime.ethers.getContractAt("CreditPair", creditPairDeployment.address);

      const CreditRouterDeployment = await hardhatRuntime.deployments.get("Router");
      const router = await hardhatRuntime.ethers.getContractAt("CreditRouter", CreditRouterDeployment.address);

      const assetAddress = await creditPair.asset();
      const collateralAddress = await creditPair.collateral();

      const asset = await hardhatRuntime.ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
        assetAddress
      );
      const collateral = await hardhatRuntime.ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
        collateralAddress
      );

      console.log("Balance before borrow", await asset.balanceOf(caller.address));

      const assetDecimals = await asset.decimals();
      const collateralDecimals = await collateral.decimals();

      const collateralIn = hardhatRuntime.ethers.utils.parseUnits(taskArgs.collateralIn, collateralDecimals);
      const assetOut = hardhatRuntime.ethers.utils.parseUnits(taskArgs.assetOut, assetDecimals);
      const maxDebt = hardhatRuntime.ethers.utils.parseUnits(taskArgs.maxDebt, assetDecimals);
      const percent = taskArgs.percent;
      const maturity = taskArgs.maturity;
      const assetTo = caller.address;
      const dueTo = caller.address;
      const deadline = blockTimestamp + 3600; // now + 1h

      await router.connect(caller).borrowGivenPercentETHCollateral(
        {
          asset: asset.address,
          maturity,
          assetTo,
          dueTo,
          assetOut,
          percent,
          maxDebt,
          deadline,
        },
        { value: collateralIn }
      );

      console.log("Balance before borrow", await asset.balanceOf(caller.address));

      console.log(`Borrowed ${assetOut} to ${creditPair.address} for ${maturity}`);
    });
};
export { borrow };

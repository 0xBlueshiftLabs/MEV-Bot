import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task, types } from "hardhat/config";

const lend: () => void = () => {
  task("lend", "Lend to the pool")
    .addParam("userId", "User id")
    .addParam("poolId", "Pool id")
    .addOptionalParam("percent", "percent", 2 ** 31, types.int)
    .addParam("assetIn", "Asset in in the pair (in eth)")
    .addParam("minLoan", "minLoan")
    .addParam("minCoverage", "minCoverage")
    .addParam("maturity", "Maturity in seconds")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[taskArgs.userId];
      console.log("Using the account:", caller.address);

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

      const assetDecimals = await asset.decimals();
      const collateralDecimals = await collateral.decimals();

      const assetIn = hardhatRuntime.ethers.utils.parseUnits(taskArgs.assetIn, assetDecimals);
      const minLoan = hardhatRuntime.ethers.utils.parseUnits(taskArgs.minLoan, assetDecimals);
      const minCoverage = hardhatRuntime.ethers.utils.parseUnits(taskArgs.minCoverage, collateralDecimals);

      // check balance
      const assetBalance = await asset.balanceOf(caller.address);
      if (assetBalance.lt(assetIn)) {
        throw new Error("Not enough asset balance");
      }

      // approve
      await asset.connect(caller).approve(router.address, hardhatRuntime.ethers.constants.MaxUint256);

      const blockTimestamp = (await hardhatRuntime.ethers.provider.getBlock("latest")).timestamp;
      const percent = taskArgs.percent;
      const maturity = taskArgs.maturity;
      const to = caller.address; // admin
      const deadline = blockTimestamp + 3600; // now + 1h

      await router.connect(caller).lendGivenPercentETHCollateral({
        asset: asset.address,
        maturity,
        to,
        assetIn,
        percent,
        minLoan,
        minCoverage,
        deadline,
      });

      console.log(`Lended ${assetIn} to ${creditPair.address} for ${maturity}`);
    });
};
export { lend };

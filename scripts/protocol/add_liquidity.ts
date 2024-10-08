import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const addLiquidity: () => void = () => {
  task("addLiquidity", "Add liquidity to a pool")
    .addParam("userId", "User id")
    .addParam("poolId", "Pool id")
    .addParam("assetIn", "Asset in in the pair (in eth")
    .addParam("maxDebt", "Max debt to the pair (in eth)")
    .addParam("collateralIn", "Collateral in in the pair (in eth)")
    .addParam("maturity", "Maturity in seconds")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const { deployments } = hardhatRuntime;
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
      const maxDebt = hardhatRuntime.ethers.utils.parseUnits(taskArgs.maxDebt, assetDecimals);
      const collateralIn = hardhatRuntime.ethers.utils.parseUnits(taskArgs.collateralIn, collateralDecimals);

      // check balance
      const assetBalance = await asset.balanceOf(caller.address);
      if (assetBalance.lt(assetIn)) {
        throw new Error("Not enough asset balance");
      }

      // approve
      await asset.connect(caller).approve(router.address, hardhatRuntime.ethers.constants.MaxUint256);

      const blockTimestamp = (await hardhatRuntime.ethers.provider.getBlock("latest")).timestamp;

      const maturity = taskArgs.maturity;
      const liquidityTo = caller.address; // admin
      const dueTo = caller.address; // admin
      const deadline = blockTimestamp + 3600; // now + 1h

      await router.connect(caller).liquidityGivenAssetETHCollateral(
        {
          asset: asset.address,
          maturity,
          liquidityTo,
          dueTo,
          assetIn,
          minLiquidity: 0,
          maxDebt: 0,
          deadline,
        },
        { value: collateralIn }
      );

      console.log(`Liquidity added to ${creditPair.address} for ${maturity}`);
    });
};
export { addLiquidity };

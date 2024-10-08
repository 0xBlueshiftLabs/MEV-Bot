import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task, types } from "hardhat/config";

const newLiquidity: () => void = () => {
  task("newLiquidity", "Initiate a pool by adding initial liquidity")
    .addParam("poolId", "Pool id")
    .addParam("assetIn", "Asset in in the pair (in eth")
    .addParam("debtIn", "Debt in in the pair (in eth)")
    .addParam("collateralIn", "Collateral in in the pair (in eth)")
    .addOptionalParam("maturity", "Maturity in seconds", 2419200, types.int)
    .setAction(async (taskArgs, hardhatRuntime) => {
      const { deployments } = hardhatRuntime;
      const [caller] = await hardhatRuntime.ethers.getSigners();
      console.log("Using the account:", caller.address);

      const creditPairDeployment = await hardhatRuntime.deployments.get(`CreditPair${taskArgs.poolId}`);

      const creditPair = await hardhatRuntime.ethers.getContractAt("CreditPair", creditPairDeployment.address);

      const CreditRouterDeployment = await hardhatRuntime.deployments.get("Router");
      const router = await hardhatRuntime.ethers.getContractAt("CreditRouter", CreditRouterDeployment.address);

      const assetAddress = await creditPair.asset();
      const collateralAddress = await creditPair.collateral();
      const wethAddress = (await deployments.get("WETH")).address;

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
      const debtIn = hardhatRuntime.ethers.utils.parseUnits(taskArgs.debtIn, assetDecimals);
      const collateralIn = hardhatRuntime.ethers.utils.parseUnits(taskArgs.collateralIn, collateralDecimals);

      // check balance, if not enough, deposit to weth
      const collateralBalance = await collateral.balanceOf(caller.address);

      if (collateralBalance.lt(collateralIn)) {
        if (collateralAddress.toLowerCase() === wethAddress.toLowerCase()) {
          const weth = await hardhatRuntime.ethers.getContractAt("WETH9", collateralAddress);
          await weth.connect(caller).deposit({ value: collateralIn });
        } else {
          throw new Error("Not enough collateral balance");
        }
      }
      const assetBalance = await asset.balanceOf(caller.address);
      if (assetBalance.lt(assetIn)) {
        throw new Error("Not enough asset balance");
      }

      // approve
      await collateral.connect(caller).approve(router.address, hardhatRuntime.ethers.constants.MaxUint256);
      await asset.connect(caller).approve(router.address, hardhatRuntime.ethers.constants.MaxUint256);

      const blockTimestamp = (await hardhatRuntime.ethers.provider.getBlock("latest")).timestamp;

      const maturity = blockTimestamp + taskArgs.maturity; // 30 days by default
      const liquidityTo = caller.address; // admin
      const dueTo = caller.address; // admin
      const deadline = blockTimestamp + 3600; // now + 1h

      console.log("here");

      await router.connect(caller).newLiquidity({
        asset: asset.address,
        collateral: collateral.address,
        maturity,
        liquidityTo,
        dueTo,
        assetIn,
        debtIn,
        collateralIn,
        deadline,
      });

      console.log(`Liquidity added to ${creditPair.address} for ${maturity}`);
    });
};
export { newLiquidity };

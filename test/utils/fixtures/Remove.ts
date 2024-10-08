import { BigNumber } from "ethers";
import { IBurn } from "../../../typechain/IRouter";
import { DeploymentContext } from "./Deploy";

interface RemoveLiquidityParams {
  assetTo: string;
  collateralTo: string;
  creditPositionId: BigNumber;
}

export async function removeLiquidity(
  deploymentContext: DeploymentContext,
  maturity: BigNumber,
  removeLiquidityParams: RemoveLiquidityParams
) {
  const { router, assetToken, collateralToken } = deploymentContext;

  const removeLiquidityInput: IBurn.RemoveLiquidityStruct = {
    asset: assetToken.address,
    collateral: collateralToken.address,
    maturity: maturity,
    ...removeLiquidityParams,
  };

  const txn = await router.removeLiquidity(removeLiquidityInput);
  const receipt = await txn.wait();

  return receipt;
}

export async function removeLiquidityETHAsset(
  deploymentContext: DeploymentContext,
  maturity: BigNumber,
  removeLiquidityParams: RemoveLiquidityParams
) {
  const { router, collateralToken } = deploymentContext;

  const removeLiquidityInput: IBurn.RemoveLiquidityETHAssetStruct = {
    collateral: collateralToken.address,
    maturity: maturity,
    ...removeLiquidityParams,
  };

  const txn = await router.removeLiquidityETHAsset(removeLiquidityInput);
  const receipt = await txn.wait();

  return receipt;
}

export async function removeLiquidityETHCollateral(
  deploymentContext: DeploymentContext,
  maturity: BigNumber,
  removeLiquidityParams: RemoveLiquidityParams
) {
  const { router, assetToken } = deploymentContext;

  const removeLiquidityInput: IBurn.RemoveLiquidityETHCollateralStruct = {
    asset: assetToken.address,
    maturity: maturity,
    ...removeLiquidityParams,
  };

  const txn = await router.removeLiquidityETHCollateral(removeLiquidityInput);
  const receipt = await txn.wait();

  return receipt;
}

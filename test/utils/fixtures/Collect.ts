import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { IWithdraw } from "../../../typechain/IRouter";
import { DeploymentContext } from "./Deploy";

interface CollectParams {
  creditPositionId: BigNumber;
}

export async function collect(
  deploymentContext: DeploymentContext,
  maturity: BigNumber,
  collectParams: CollectParams,
  receiver: SignerWithAddress
) {
  const { router, assetToken, collateralToken } = deploymentContext;

  const collectInput: IWithdraw.CollectStruct = {
    asset: assetToken.address,
    collateral: collateralToken.address,
    maturity: maturity,
    collateralTo: receiver.address,
    assetTo: receiver.address,
    ...collectParams,
  };

  const txn = await router.connect(receiver).collect(collectInput);
  const receipt = await txn.wait();

  return receipt;
}

export async function collectETHAsset(
  deploymentContext: DeploymentContext,
  maturity: BigNumber,
  collectParams: CollectParams,
  receiver: SignerWithAddress
) {
  const { router, collateralToken } = deploymentContext;

  const collectInput: IWithdraw.CollectETHAssetStruct = {
    collateral: collateralToken.address,
    maturity: maturity,
    collateralTo: receiver.address,
    assetTo: receiver.address,
    ...collectParams,
  };

  const txn = await router.connect(receiver).collectETHAsset(collectInput);
  const receipt = await txn.wait();

  return receipt;
}

export async function collectETHCollateral(
  deploymentContext: DeploymentContext,
  maturity: BigNumber,
  collectParams: CollectParams,
  receiver: SignerWithAddress
) {
  const { router, assetToken } = deploymentContext;

  const collectInput: IWithdraw.CollectETHCollateralStruct = {
    asset: assetToken.address,
    maturity: maturity,
    collateralTo: receiver.address,
    assetTo: receiver.address,
    ...collectParams,
  };

  const txn = await router.connect(receiver).collectETHCollateral(collectInput);
  const receipt = await txn.wait();

  return receipt;
}

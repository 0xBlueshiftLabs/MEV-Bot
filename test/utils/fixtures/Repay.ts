import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { IPay } from "../../../typechain/IRouter";
import { DeploymentContext } from "./Deploy";

interface RepayParams {
  creditPositionId: BigNumber;
}

export async function repay(
  deploymentContext: DeploymentContext,
  maturity: BigNumber,
  repayParams: RepayParams,
  receiver: SignerWithAddress
) {
  const { router, assetToken, collateralToken } = deploymentContext;

  const repayInput: IPay.RepayStruct = {
    asset: assetToken.address,
    collateral: collateralToken.address,
    maturity: maturity,
    collateralTo: receiver.address,
    ...repayParams,
    deadline: maturity,
  };

  const txn = await router.connect(receiver).repay(repayInput);
  const receipt = await txn.wait();

  return receipt;
}

export async function repayETHAsset(
  deploymentContext: DeploymentContext,
  maturity: BigNumber,
  repayParams: RepayParams,
  receiver: SignerWithAddress,
  assetOut: BigNumber
) {
  const { router, collateralToken } = deploymentContext;

  const repayInput: IPay.RepayETHAssetStruct = {
    collateral: collateralToken.address,
    maturity: maturity,
    collateralTo: receiver.address,
    ...repayParams,
    deadline: maturity,
  };

  const txn = await router.connect(receiver).repayETHAsset(repayInput, { value: assetOut });
  const receipt = await txn.wait();

  return receipt;
}

export async function repayETHCollateral(
  deploymentContext: DeploymentContext,
  maturity: BigNumber,
  repayParams: RepayParams,
  receiver: SignerWithAddress
) {
  const { router, assetToken } = deploymentContext;

  const repayInput: IPay.RepayETHCollateralStruct = {
    asset: assetToken.address,
    maturity: maturity,
    collateralTo: receiver.address,
    ...repayParams,
    deadline: maturity,
  };

  const txn = await router.connect(receiver).repayETHCollateral(repayInput);
  const receipt = await txn.wait();

  return receipt;
}

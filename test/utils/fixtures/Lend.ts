import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { ILend } from "../../../typechain/IRouter";
import { DeploymentContext } from "./Deploy";

interface LendGivenPercentParams {
  assetIn: BigNumber;
  percent: BigNumber;
  minCoverage: BigNumber;
  minLoan: BigNumber;
}

export async function lendGivenPercent(
  deploymentContext: DeploymentContext,
  maturity: BigNumber,
  lendGivenPercentParams: LendGivenPercentParams,
  receiver: SignerWithAddress
) {
  const { router, assetToken, collateralToken } = deploymentContext;

  const lendGivenPercentInput: ILend.LendGivenPercentStruct = {
    asset: assetToken.address,
    collateral: collateralToken.address,
    maturity: maturity,
    to: receiver.address,
    ...lendGivenPercentParams,
    deadline: maturity,
  };

  const txn = await router.connect(receiver).lendGivenPercent(lendGivenPercentInput);
  const receipt = await txn.wait();

  return receipt;
}

export async function lendGivenPercentETHAsset(
  deploymentContext: DeploymentContext,
  maturity: BigNumber,
  lendGivenPercentParams: LendGivenPercentParams,
  receiver: SignerWithAddress
) {
  const { router, collateralToken } = deploymentContext;

  const lendGivenPercentInput: ILend.LendGivenPercentETHAssetStruct = {
    collateral: collateralToken.address,
    maturity: maturity,
    to: receiver.address,
    ...lendGivenPercentParams,
    deadline: maturity,
  };

  const txn = await router.connect(receiver).lendGivenPercentETHAsset(lendGivenPercentInput, {
    value: lendGivenPercentParams.assetIn,
  });
  const receipt = await txn.wait();

  return receipt;
}

export async function lendGivenPercentETHCollateral(
  deploymentContext: DeploymentContext,
  maturity: BigNumber,
  lendGivenPercentParams: LendGivenPercentParams,
  receiver: SignerWithAddress
) {
  const { router, assetToken } = deploymentContext;

  const lendGivenPercentInput: ILend.LendGivenPercentETHCollateralStruct = {
    asset: assetToken.address,
    maturity: maturity,
    to: receiver.address,
    ...lendGivenPercentParams,
    deadline: maturity,
  };

  const txn = await router.connect(receiver).lendGivenPercentETHCollateral(lendGivenPercentInput);
  const receipt = await txn.wait();

  return receipt;
}

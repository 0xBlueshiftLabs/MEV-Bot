import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { IBorrow } from "../../../typechain/IRouter";
import { DeploymentContext } from "./Deploy";

interface BorrowGivenPercentParams {
  assetOut: BigNumber;
  percent: BigNumber;
  maxDebt: BigNumber;
  maxCollateral: BigNumber;
}

export async function borrowGivenPercent(
  deploymentContext: DeploymentContext,
  maturity: BigNumber,
  borrowGivenPercentParams: BorrowGivenPercentParams,
  receiver: SignerWithAddress
) {
  const { router, assetToken, collateralToken } = deploymentContext;

  const borrowGivenPercentInput: IBorrow.BorrowGivenPercentStruct = {
    asset: assetToken.address,
    collateral: collateralToken.address,
    maturity: maturity,
    assetTo: receiver.address,
    dueTo: receiver.address,
    ...borrowGivenPercentParams,
    deadline: maturity,
  };

  const txn = await router.connect(receiver).borrowGivenPercent(borrowGivenPercentInput);
  const receipt = await txn.wait();

  return receipt;
}

export async function borrowGivenPercentETHAsset(
  deploymentContext: DeploymentContext,
  maturity: BigNumber,
  borrowGivenPercentParams: BorrowGivenPercentParams,
  receiver: SignerWithAddress
) {
  const { router, collateralToken } = deploymentContext;

  const borrowGivenPercentInput: IBorrow.BorrowGivenPercentETHAssetStruct = {
    collateral: collateralToken.address,
    maturity: maturity,
    assetTo: receiver.address,
    dueTo: receiver.address,
    ...borrowGivenPercentParams,
    deadline: maturity,
  };

  const txn = await router.connect(receiver).borrowGivenPercentETHAsset(borrowGivenPercentInput);
  const receipt = await txn.wait();

  return receipt;
}

export async function borrowGivenPercentETHCollateral(
  deploymentContext: DeploymentContext,
  maturity: BigNumber,
  borrowGivenPercentParams: BorrowGivenPercentParams,
  receiver: SignerWithAddress
) {
  const { router, assetToken } = deploymentContext;

  const borrowGivenPercentInput: IBorrow.BorrowGivenPercentETHCollateralStruct = {
    asset: assetToken.address,
    maturity: maturity,
    assetTo: receiver.address,
    dueTo: receiver.address,
    ...borrowGivenPercentParams,
    deadline: maturity,
  };

  const txn = await router.connect(receiver).borrowGivenPercentETHCollateral(borrowGivenPercentInput, {
    value: borrowGivenPercentParams.maxCollateral,
  });
  const receipt = await txn.wait();

  return receipt;
}

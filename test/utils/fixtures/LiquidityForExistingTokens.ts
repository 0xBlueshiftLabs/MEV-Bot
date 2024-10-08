import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { IMint } from "../../../typechain/IRouter";
import { DeploymentContextForExistingTokens } from "./DeployForExistingTokens";

interface NewLiquidityParams {
  assetIn: BigNumber;
  debtIn: BigNumber;
  collateralIn: BigNumber;
}

interface LiquidityAssetParams {
  assetIn: BigNumber;
  minLiquidity: BigNumber;
  maxDebt: BigNumber;
  maxCollateral: BigNumber;
}

interface LiquidityCollateralParams {
  collateralIn: BigNumber;
  minLiquidity: BigNumber;
  maxAsset: BigNumber;
  maxDebt: BigNumber;
}

export async function newLiquidity(
  deploymentContext: DeploymentContextForExistingTokens,
  maturity: BigNumber,
  newLiquidityParams: NewLiquidityParams,
  receiver: SignerWithAddress
) {
  const { router, assetToken, collateralToken } = deploymentContext;

  const newLiquidityInput: IMint.NewLiquidityStruct = {
    ...newLiquidityParams,
    maturity: maturity,
    liquidityTo: receiver.address,
    dueTo: receiver.address,
    deadline: maturity,
    asset: assetToken.address,
    collateral: collateralToken.address,
  };

  const txn = await router.newLiquidity(newLiquidityInput);

  const receipt = await txn.wait();

  return receipt;
}

export async function newLiquidityETHAsset(
  deploymentContext: DeploymentContextForExistingTokens,
  maturity: BigNumber,
  newLiquidityParams: NewLiquidityParams,
  receiver: SignerWithAddress
) {
  const { router, collateralToken } = deploymentContext;

  const newLiquidityInput: IMint.NewLiquidityETHAssetStruct = {
    collateral: collateralToken.address,
    maturity: maturity,
    liquidityTo: receiver.address,
    dueTo: receiver.address,
    ...newLiquidityParams,
    deadline: maturity,
  };

  const txn = await router.newLiquidityETHAsset(newLiquidityInput, { value: newLiquidityParams.assetIn });
  const receipt = await txn.wait();

  return receipt;
}

export async function newLiquidityETHCollateral(
  deploymentContext: DeploymentContextForExistingTokens,
  maturity: BigNumber,
  newLiquidityParams: NewLiquidityParams,
  receiver: SignerWithAddress
) {
  const { router, assetToken } = deploymentContext;

  const newLiquidityInput: IMint.NewLiquidityETHCollateralStruct = {
    asset: assetToken.address,
    maturity: maturity,
    liquidityTo: receiver.address,
    dueTo: receiver.address,
    ...newLiquidityParams,
    deadline: maturity,
  };

  const txn = await router.newLiquidityETHCollateral(newLiquidityInput, {
    value: newLiquidityParams.collateralIn,
  });
  const receipt = await txn.wait();

  return receipt;
}

export async function liquidityGivenAsset(
  deploymentContext: DeploymentContextForExistingTokens,
  maturity: BigNumber,
  liquidityGivenAssetParams: LiquidityAssetParams,
  receiver: SignerWithAddress
) {
  const { router, assetToken, collateralToken } = deploymentContext;

  const liquidityGivenAssetInput: IMint.LiquidityGivenAssetStruct = {
    asset: assetToken.address,
    collateral: collateralToken.address,
    maturity: maturity,
    liquidityTo: receiver.address,
    dueTo: receiver.address,
    ...liquidityGivenAssetParams,
    deadline: maturity,
  };

  const txn = await router.liquidityGivenAsset(liquidityGivenAssetInput);
  const receipt = await txn.wait();

  return receipt;
}

export async function liquidityGivenAssetETHAsset(
  deploymentContext: DeploymentContextForExistingTokens,
  maturity: BigNumber,
  liquidityGivenAssetParams: LiquidityAssetParams,
  receiver: SignerWithAddress
) {
  const { router, collateralToken } = deploymentContext;

  const liquidityGivenAssetInput: IMint.LiquidityGivenAssetETHAssetStruct = {
    collateral: collateralToken.address,
    maturity: maturity,
    liquidityTo: receiver.address,
    dueTo: receiver.address,
    ...liquidityGivenAssetParams,
    deadline: maturity,
  };

  const txn = await router.liquidityGivenAssetETHAsset(liquidityGivenAssetInput, {
    value: liquidityGivenAssetParams.assetIn,
  });
  const receipt = await txn.wait();

  return receipt;
}

export async function liquidityGivenAssetETHCollateral(
  deploymentContext: DeploymentContextForExistingTokens,
  maturity: BigNumber,
  liquidityGivenAssetParams: LiquidityAssetParams,
  receiver: SignerWithAddress
) {
  const { router, assetToken } = deploymentContext;

  const liquidityGivenAssetInput: IMint.LiquidityGivenAssetETHCollateralStruct = {
    asset: assetToken.address,
    maturity: maturity,
    liquidityTo: receiver.address,
    dueTo: receiver.address,
    ...liquidityGivenAssetParams,
    deadline: maturity,
  };

  const txn = await router.liquidityGivenAssetETHCollateral(liquidityGivenAssetInput, {
    value: liquidityGivenAssetParams.maxCollateral,
  });
  const receipt = await txn.wait();

  return receipt;
}

export async function liquidityGivenCollateral(
  deploymentContext: DeploymentContextForExistingTokens,
  maturity: BigNumber,
  liquidityGivenCollateralParams: LiquidityCollateralParams,
  receiver: SignerWithAddress
) {
  const { router, assetToken, collateralToken } = deploymentContext;

  const liquidityGivenCollateralInput: IMint.LiquidityGivenCollateralStruct = {
    asset: assetToken.address,
    collateral: collateralToken.address,
    maturity: maturity,
    liquidityTo: receiver.address,
    dueTo: receiver.address,
    ...liquidityGivenCollateralParams,
    deadline: maturity,
  };

  const txn = await router.liquidityGivenCollateral(liquidityGivenCollateralInput);
  const receipt = await txn.wait();

  return receipt;
}

export async function liquidityGivenCollateralETHAsset(
  deploymentContext: DeploymentContextForExistingTokens,
  maturity: BigNumber,
  liquidityGivenCollateralParams: LiquidityCollateralParams,
  receiver: SignerWithAddress
) {
  const { router, collateralToken } = deploymentContext;

  const liquidityGivenCollateralInput: IMint.LiquidityGivenCollateralETHAssetStruct = {
    collateral: collateralToken.address,
    maturity: maturity,
    liquidityTo: receiver.address,
    dueTo: receiver.address,
    ...liquidityGivenCollateralParams,
    deadline: maturity,
  };

  const txn = await router.liquidityGivenCollateralETHAsset(liquidityGivenCollateralInput, {
    value: liquidityGivenCollateralParams.maxAsset,
  });
  const receipt = await txn.wait();

  return receipt;
}

export async function liquidityGivenCollateralETHCollateral(
  deploymentContext: DeploymentContextForExistingTokens,
  maturity: BigNumber,
  liquidityGivenCollateralParams: LiquidityCollateralParams,
  receiver: SignerWithAddress
) {
  const { router, assetToken } = deploymentContext;

  const liquidityGivenCollateralInput: IMint.LiquidityGivenCollateralETHCollateralStruct = {
    asset: assetToken.address,
    maturity: maturity,
    liquidityTo: receiver.address,
    dueTo: receiver.address,
    ...liquidityGivenCollateralParams,
    deadline: maturity,
  };

  const txn = await router.liquidityGivenCollateralETHCollateral(liquidityGivenCollateralInput, {
    value: liquidityGivenCollateralParams.collateralIn,
  });
  const receipt = await txn.wait();

  return receipt;
}

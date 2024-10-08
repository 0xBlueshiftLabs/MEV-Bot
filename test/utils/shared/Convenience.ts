import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CreditPosition } from "../../../typechain";
import type { CreditFactory as FactoryContract } from "../../../typechain/CreditFactory";
import type { CreditRouter as RouterContract } from "../../../typechain/CreditRouter";
import { TestToken } from "../../../typechain/TestToken";
import type { WETH9 as WethContract } from "../../../typechain/WETH9";
import { deploy } from "./DeployRouter";

interface Receipt {
  liquidity: string;
  loanInterest: string;
  loanPrincipal: string;
  coverageInterest: string;
  coveragePrincipal: string;
  lockedDebt: string;
}
export class Router {
  public routerContract: RouterContract;
  public factoryContract: FactoryContract;
  public wethContract: WethContract;
  public signer: SignerWithAddress;
  public creditPosition: CreditPosition;
  constructor(
    routerContract: RouterContract,
    factoryContract: FactoryContract,
    wethContract: WethContract,
    signer: SignerWithAddress,
    creditPosition: CreditPosition
  ) {
    this.routerContract = routerContract;
    this.factoryContract = factoryContract;
    this.wethContract = wethContract;
    this.signer = signer;
    this.creditPosition = creditPosition;
  }
  async updateSigner(signer: SignerWithAddress) {
    this.signer = signer;
  }

  async getReceipts(asset: string, collateral: string, maturity: bigint): Promise<Receipt> {
    return await this.routerContract.getReceipt(asset, collateral, maturity);
  }

  async getCreditPosition(): Promise<string> {
    return await this.routerContract.creditPosition();
  }

  async newLiquidity(
    maturity: bigint,
    asset: string,
    collateral: string,
    assetIn: bigint,
    debtIn: bigint,
    collateralIn: bigint
  ) {
    return await this.routerContract.newLiquidity({
      maturity: maturity,
      asset: asset,
      collateral: collateral,
      assetIn: assetIn,
      debtIn: debtIn,
      collateralIn: collateralIn,
      dueTo: this.signer.address,
      liquidityTo: this.signer.address,
      deadline: maturity,
    });
  }
  async newLiquidityETHAsset(
    maturity: bigint,
    collateral: string,
    assetIn: bigint,
    debtIn: bigint,
    collateralIn: bigint
  ) {
    return await this.routerContract.newLiquidityETHAsset(
      {
        maturity: maturity,
        collateral: collateral,
        debtIn: debtIn,
        collateralIn: collateralIn,
        dueTo: this.signer.address,
        liquidityTo: this.signer.address,
        deadline: maturity,
      },
      { value: assetIn }
    );
  }
  async newLiquidityETHCollateral(
    maturity: bigint,
    asset: string,
    assetIn: bigint,
    debtIn: bigint,
    collateralIn: bigint
  ) {
    return await this.routerContract.newLiquidityETHCollateral(
      {
        maturity: maturity,
        asset: asset,
        assetIn: assetIn,
        debtIn: debtIn,
        dueTo: this.signer.address,
        liquidityTo: this.signer.address,
        deadline: maturity,
      },
      { value: collateralIn }
    );
  }
  async liquidityGivenAsset(
    maturity: bigint,
    asset: string,
    collateral: string,
    assetIn: bigint,
    minLiquidity: bigint,
    maxDebt: bigint,
    maxCollateral: bigint
  ) {
    return await this.routerContract.liquidityGivenAsset({
      maturity: maturity,
      asset: asset,
      collateral: collateral,
      assetIn: assetIn,
      minLiquidity: minLiquidity,
      maxDebt: maxDebt,
      maxCollateral: maxCollateral,
      dueTo: this.signer.address,
      liquidityTo: this.signer.address,
      deadline: maturity,
    });
  }
  async liquidityGivenAssetETHAsset(
    maturity: bigint,
    collateral: string,
    assetIn: bigint,
    minLiquidity: bigint,
    maxDebt: bigint,
    maxCollateral: bigint
  ) {
    return await this.routerContract.liquidityGivenAssetETHAsset(
      {
        maturity: maturity,
        collateral: collateral,
        minLiquidity: minLiquidity,
        maxDebt: maxDebt,
        maxCollateral: maxCollateral,
        dueTo: this.signer.address,
        liquidityTo: this.signer.address,
        deadline: maturity,
      },
      { value: assetIn }
    );
  }
  async liquidityGivenAssetETHCollateral(
    maturity: bigint,
    asset: string,
    assetIn: bigint,
    minLiquidity: bigint,
    maxDebt: bigint,
    maxCollateral: bigint
  ) {
    return await this.routerContract.liquidityGivenAssetETHCollateral(
      {
        maturity: maturity,
        asset: asset,
        assetIn: assetIn,
        minLiquidity: minLiquidity,
        maxDebt: maxDebt,
        dueTo: this.signer.address,
        liquidityTo: this.signer.address,
        deadline: maturity,
      },
      { value: maxCollateral }
    );
  }

  async liquidityGivenCollateral(
    maturity: bigint,
    asset: string,
    collateral: string,
    collateralIn: bigint,
    minLiquidity: bigint,
    maxDebt: bigint,
    maxAsset: bigint
  ) {
    return await this.routerContract.liquidityGivenCollateral({
      maturity: maturity,
      asset: asset,
      collateral: collateral,
      collateralIn: collateralIn,
      minLiquidity: minLiquidity,
      maxDebt: maxDebt,
      maxAsset: maxAsset,
      dueTo: this.signer.address,
      liquidityTo: this.signer.address,
      deadline: maturity,
    });
  }
  async liquidityGivenCollateralETHAsset(
    maturity: bigint,
    collateral: string,
    collateralIn: bigint,
    minLiquidity: bigint,
    maxDebt: bigint,
    maxAsset: bigint
  ) {
    return await this.routerContract.liquidityGivenCollateralETHAsset(
      {
        maturity: maturity,
        collateral: collateral,
        collateralIn: collateralIn,
        minLiquidity: minLiquidity,
        maxDebt: maxDebt,
        dueTo: this.signer.address,
        liquidityTo: this.signer.address,
        deadline: maturity,
      },
      { value: maxAsset }
    );
  }
  async liquidityGivenCollateralETHCollateral(
    maturity: bigint,
    asset: string,
    collateralIn: bigint,
    minLiquidity: bigint,
    maxDebt: bigint,
    maxAsset: bigint
  ) {
    return await this.routerContract.liquidityGivenCollateralETHCollateral(
      {
        maturity: maturity,
        asset: asset,
        minLiquidity: minLiquidity,
        maxDebt: maxDebt,
        maxAsset: maxAsset,
        dueTo: this.signer.address,
        liquidityTo: this.signer.address,
        deadline: maturity,
      },
      { value: collateralIn }
    );
  }
  async removeLiquidity(maturity: bigint, asset: string, collateral: string, creditPositionId: bigint) {
    return await this.routerContract.removeLiquidity({
      maturity: maturity,
      asset: asset,
      collateral: collateral,
      assetTo: this.signer.address,
      collateralTo: this.signer.address,
      creditPositionId: creditPositionId,
    });
  }
  async removeLiquidityETHAsset(maturity: bigint, collateral: string, creditPositionId: bigint) {
    return await this.routerContract.removeLiquidityETHAsset({
      maturity: maturity,
      collateral: collateral,
      assetTo: this.signer.address,
      collateralTo: this.signer.address,
      creditPositionId: creditPositionId,
    });
  }
  async removeLiquidityETHCollateral(maturity: bigint, asset: string, creditPositionId: bigint) {
    return await this.routerContract.removeLiquidityETHCollateral({
      maturity: maturity,
      asset: asset,
      assetTo: this.signer.address,
      collateralTo: this.signer.address,
      creditPositionId: creditPositionId,
    });
  }

  async lendGivenPercent(
    maturity: bigint,
    asset: string,
    collateral: string,
    assetIn: bigint,
    minCoverage: bigint,
    minLoan: bigint,
    percent: bigint
  ) {
    return await this.routerContract.lendGivenPercent({
      maturity: maturity,
      asset: asset,
      collateral: collateral,
      to: this.signer.address,
      assetIn: assetIn,
      percent: percent,
      minCoverage: minCoverage,
      minLoan: minLoan,
      deadline: maturity,
    });
  }
  async lendGivenPercentETHAsset(
    maturity: bigint,
    collateral: string,
    assetIn: bigint,
    minCoverage: bigint,
    minLoan: bigint,
    percent: bigint
  ) {
    return await this.routerContract.lendGivenPercentETHAsset(
      {
        maturity: maturity,
        collateral: collateral,
        to: this.signer.address,
        percent: percent,
        minCoverage: minCoverage,
        minLoan: minLoan,
        deadline: maturity,
      },
      { value: assetIn }
    );
  }
  async lendGivenPercentETHCollateral(
    maturity: bigint,
    asset: string,
    assetIn: bigint,
    minCoverage: bigint,
    minLoan: bigint,
    percent: bigint
  ) {
    return await this.routerContract.lendGivenPercentETHCollateral({
      maturity: maturity,
      asset: asset,
      to: this.signer.address,
      assetIn: assetIn,
      percent: percent,
      minCoverage: minCoverage,
      minLoan: minLoan,
      deadline: maturity,
    });
  }
  async collectETHAsset(maturity: bigint, collateral: string, creditPositionId: bigint) {
    return await this.routerContract.collectETHAsset({
      maturity: maturity,
      collateral: collateral,
      collateralTo: this.signer.address,
      assetTo: this.signer.address,
      creditPositionId: creditPositionId,
    });
  }
  async collectETHCollateral(maturity: bigint, asset: string, creditPositionId: bigint) {
    return await this.routerContract.collectETHCollateral({
      maturity: maturity,
      asset: asset,
      collateralTo: this.signer.address,
      assetTo: this.signer.address,
      creditPositionId: creditPositionId,
    });
  }
  async collect(maturity: bigint, asset: string, collateral: string, creditPositionId: bigint) {
    return await this.routerContract.collect({
      maturity: maturity,
      asset: asset,
      collateral: collateral,
      collateralTo: this.signer.address,
      assetTo: this.signer.address,
      creditPositionId: creditPositionId,
    });
  }

  async borrowGivenPercent(
    maturity: bigint,
    asset: string,
    collateral: string,
    assetOut: bigint,
    maxDebt: bigint,
    maxCollateral: bigint,
    percent: bigint
  ) {
    return await this.routerContract.borrowGivenPercent({
      maturity: maturity,
      asset: asset,
      collateral: collateral,
      dueTo: this.signer.address,
      assetTo: this.signer.address,
      assetOut: assetOut,
      maxDebt: maxDebt,
      maxCollateral: maxCollateral,
      percent: percent,
      deadline: maturity,
    });
  }
  async borrowGivenPercentETHAsset(
    maturity: bigint,
    collateral: string,
    assetOut: bigint,
    maxDebt: bigint,
    maxCollateral: bigint,
    percent: bigint
  ) {
    return await this.routerContract.borrowGivenPercentETHAsset({
      maturity: maturity,
      collateral: collateral,
      dueTo: this.signer.address,
      assetTo: this.signer.address,
      assetOut: assetOut,
      maxDebt: maxDebt,
      maxCollateral: maxCollateral,
      percent: percent,
      deadline: maturity,
    });
  }
  async borrowGivenPercentETHCollateral(
    maturity: bigint,
    asset: string,
    assetOut: bigint,
    maxDebt: bigint,
    maxCollateral: bigint,
    percent: bigint
  ) {
    return await this.routerContract.borrowGivenPercentETHCollateral(
      {
        maturity: maturity,
        asset: asset,
        dueTo: this.signer.address,
        assetTo: this.signer.address,
        assetOut: assetOut,
        maxDebt: maxDebt,
        percent: percent,
        deadline: maturity,
      },
      { value: maxCollateral }
    );
  }
  async repay(maturity: bigint, asset: string, collateral: string, creditPositionId: bigint) {
    return await this.routerContract.repay({
      maturity: maturity,
      asset: asset,
      collateral: collateral,
      collateralTo: this.signer.address,
      creditPositionId: creditPositionId,
      deadline: maturity,
    });
  }
  async repayETHAsset(maturity: bigint, collateral: string, creditPositionId: bigint, assetIn: bigint) {
    return await this.routerContract.repayETHAsset(
      {
        maturity: maturity,
        collateral: collateral,
        collateralTo: this.signer.address,
        creditPositionId: creditPositionId,
        deadline: maturity,
      },
      { value: assetIn }
    );
  }
  async repayETHCollateral(maturity: bigint, asset: string, creditPositionId: bigint) {
    return await this.routerContract.repayETHCollateral({
      maturity: maturity,
      asset: asset,
      collateralTo: this.signer.address,
      creditPositionId: creditPositionId,
      deadline: maturity,
    });
  }
}

export async function routerInit(
  maturity: bigint,
  asset: TestToken,
  collateral: TestToken,
  signerWithAddress: SignerWithAddress,
  creditPosition: CreditPosition
) {
  const { router, factory, weth } = await deploy(asset, collateral, maturity, creditPosition);
  return new Router(router, factory, weth, signerWithAddress, creditPosition);
}

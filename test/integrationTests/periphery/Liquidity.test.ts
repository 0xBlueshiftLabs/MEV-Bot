import chai from "chai";
import { BigNumber, Contract, ContractReceipt } from "ethers";
import { ethers, waffle } from "hardhat";
import { DeploymentContext, createDeploymentContextFixture } from "../../utils/fixtures/Deploy";
import {
  liquidityGivenAsset,
  liquidityGivenAssetETHAsset,
  liquidityGivenAssetETHCollateral,
  liquidityGivenCollateral,
  liquidityGivenCollateralETHAsset,
  liquidityGivenCollateralETHCollateral,
  newLiquidity,
  newLiquidityETHAsset,
  newLiquidityETHCollateral,
} from "../../utils/fixtures/Liquidity";
import { getEvent, now } from "../../utils/helper";
import { getBalanceState, getLiquidityContract } from "../../utils/state";

const { solidity, loadFixture } = waffle;
chai.use(solidity);
const { expect } = chai;

let signers = [];

const newLiquidityParams = {
  assetIn: BigNumber.from(9999),
  debtIn: BigNumber.from(12000),
  collateralIn: BigNumber.from(1000),
};

const liquidityAssetParams = {
  assetIn: BigNumber.from(10000),
  minLiquidity: BigNumber.from(5700000),
  maxDebt: BigNumber.from(12000),
  maxCollateral: BigNumber.from(10000),
};

const liquidityCollateralParams = {
  collateralIn: BigNumber.from(1299),
  minLiquidity: BigNumber.from(120),
  maxAsset: BigNumber.from(16000),
  maxDebt: BigNumber.from(16000),
};

async function fixture(): Promise<DeploymentContext> {
  signers = await ethers.getSigners();
  return await createDeploymentContextFixture(signers[0], signers[9].address);
}

describe("integration tests", () => {
  let maturity: BigNumber;
  before(async () => {
    maturity = (await now()).add(BigNumber.from(315360000));
  });

  describe("new liquidity", () => {
    it("given NewLiquidity params when newLiquidity then credit position created", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      const beforeBalanceState = await getBalanceState(context, maturity, signers[0]);

      // WHEN
      const receipt = await newLiquidity(context, maturity, newLiquidityParams, signers[0]);

      // THEN
      await assertLiquidity(context, maturity, receipt, beforeBalanceState, 0);
    });

    it("given NewLiquidityETHAsset params when newLiquidityETHAsset then credit position created", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      const beforeBalanceState = await getBalanceState(context, maturity, signers[0], true);

      // WHEN
      const receipt = await newLiquidityETHAsset(context, maturity, newLiquidityParams, signers[0]);

      // THEN
      await assertLiquidity(context, maturity, receipt, beforeBalanceState, 0, true);
    });

    it("given NewLiquidityETHCollateral params when newLiquidityETHCollateral then credit position created", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      const beforeBalanceState = await getBalanceState(context, maturity, signers[0], false, true);

      // WHEN
      const receipt = await newLiquidityETHCollateral(context, maturity, newLiquidityParams, signers[0]);

      // THEN
      await assertLiquidity(context, maturity, receipt, beforeBalanceState, 0, false, true);
    });
  });

  describe("liquidity given asset", () => {
    it("given LiquidityGivenAsset params when liquidityGivenAsset then credit position created", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await newLiquidity(context, maturity, newLiquidityParams, signers[0]);
      const beforeBalanceState = await getBalanceState(context, maturity, signers[0]);

      // WHEN
      const receipt = await liquidityGivenAsset(context, maturity, liquidityAssetParams, signers[0]);

      // THEN
      await assertLiquidity(context, maturity, receipt, beforeBalanceState, 1);
    });

    it("given LiquidityGivenAssetETHAsset params when liquidityGivenAssetETHAsset then credit position created", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await newLiquidityETHAsset(context, maturity, newLiquidityParams, signers[0]);
      const beforeBalanceState = await getBalanceState(context, maturity, signers[0], true);

      // WHEN
      const receipt = await liquidityGivenAssetETHAsset(context, maturity, liquidityAssetParams, signers[0]);

      // THEN
      await assertLiquidity(context, maturity, receipt, beforeBalanceState, 1, true);
    });
  });

  describe("liquidity given debt", () => {
    it("given LiquidityGivenAssetETHCollateral params when liquidityGivenAssetETHCollateral then credit position created", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await newLiquidityETHCollateral(context, maturity, newLiquidityParams, signers[0]);
      const beforeBalanceState = await getBalanceState(context, maturity, signers[0], false, true);

      // WHEN
      const receipt = await liquidityGivenAssetETHCollateral(context, maturity, liquidityAssetParams, signers[0]);

      // THEN
      await assertLiquidity(context, maturity, receipt, beforeBalanceState, 1, false, true);
    });
  });

  describe("liquidity given collateral", () => {
    it("given LiquidityGivenCollateral params when liquidityGivenCollateral then credit position created", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await newLiquidity(context, maturity, newLiquidityParams, signers[0]);
      const beforeBalanceState = await getBalanceState(context, maturity, signers[0]);

      // WHEN
      const receipt = await liquidityGivenCollateral(context, maturity, liquidityCollateralParams, signers[0]);

      // THEN
      await assertLiquidity(context, maturity, receipt, beforeBalanceState, 1);
    });

    it("given LiquidityGivenCollateralETHAsset params when liquidityGivenCollateralETHCollateral then credit position created", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await newLiquidityETHAsset(context, maturity, newLiquidityParams, signers[0]);
      const beforeBalanceState = await getBalanceState(context, maturity, signers[0], true);

      // WHEN
      const receipt = await liquidityGivenCollateralETHAsset(context, maturity, liquidityCollateralParams, signers[0]);

      // THEN
      await assertLiquidity(context, maturity, receipt, beforeBalanceState, 1, true);
    });

    it("given LiquidityGivenCollateralETHCollateral params when liquidityGivenCollateralETHCollateral then credit position created", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await newLiquidityETHCollateral(context, maturity, newLiquidityParams, signers[0]);
      const beforeBalanceState = await getBalanceState(context, maturity, signers[0], false, true);

      // WHEN
      const receipt = await liquidityGivenCollateralETHCollateral(
        context,
        maturity,
        liquidityCollateralParams,
        signers[0]
      );

      // THEN
      await assertLiquidity(context, maturity, receipt, beforeBalanceState, 1, false, true);
    });
  });
});

async function assertLiquidity(
  context: DeploymentContext,
  maturity: BigNumber,
  receipt: ContractReceipt,
  beforeState: any,
  creditPositionId: number,
  isETHAsset = false,
  isETHCollateral = false
) {
  let assetToken = context.assetToken as Contract;
  let collateralToken = context.collateralToken as Contract;

  const weth = await ethers.getContractAt("WETH9", await context.router.weth());
  if (isETHAsset) {
    assetToken = weth;
  }
  if (isETHCollateral) {
    collateralToken = weth;
  }

  const currentBalanceState = await getBalanceState(context, maturity, signers[0], isETHAsset, isETHCollateral);

  const factory = await ethers.getContractAt("CreditFactory", await context.router.factory());
  const maturityCP = await context.creditPosition.getMaturity(creditPositionId);
  const pairCP = await context.creditPosition.getPair(creditPositionId);
  const positionTypeCP = await context.creditPosition.getPositionType(creditPositionId);
  const wrappedContent = await context.creditPosition.getWrappedContent(creditPositionId);
  const cpToken = await context.creditPosition.getLiquidity(creditPositionId);
  const pairAddress = await factory.getPair(assetToken.address, collateralToken.address);
  const liquidityContract = await getLiquidityContract(context.router, assetToken, collateralToken, maturity);

  const pair = await ethers.getContractAt("CreditPair", pairAddress);
  const pairInterface = pair.interface;
  const mintEvent = getEvent(pairInterface, receipt, "Mint");
  const liquidityOut = mintEvent[0].args["liquidityOut"];
  const assetIn = mintEvent[0].args["assetIn"];
  const collateralIn = mintEvent[0].args["dueOut"].collateral;

  // credit position
  // TODO: check url
  expect(maturityCP).to.be.eq(maturity);
  expect(pairCP).to.be.eq(pairAddress);
  expect(positionTypeCP).to.be.eq(0);
  expect(wrappedContent).to.have.lengthOf(1);
  expect(wrappedContent[0]).to.be.deep.eq(cpToken);
  expect(cpToken["assetContract"]).to.be.eq(liquidityContract.address);
  expect(cpToken["tokenType"]).to.be.eq(4);
  expect(cpToken["tokenId"]).to.be.eq(0);
  expect(cpToken["totalAmount"]).to.be.eq(liquidityOut.toString());

  // balances
  const liquidity = currentBalanceState.liquidity.sub(beforeState.liquidity);
  const asset = currentBalanceState.asset.sub(beforeState.asset);
  const collateral = currentBalanceState.collateral.sub(beforeState.collateral);
  const creditPosition = currentBalanceState.creditPosition.sub(beforeState.creditPosition);

  expect(liquidity).to.be.eq(liquidityOut.toString());
  expect(asset).to.be.eq(assetIn);
  expect(collateral).to.be.closeTo(collateralIn, BigNumber.from(1));
  expect(creditPosition).to.be.eq(1);
  expect(await context.creditPosition.ownerOf(creditPositionId)).to.be.eq(signers[0].address);

  // pair
  const pairLiquidity = currentBalanceState.pairLiquidity.sub(beforeState.pairLiquidity);
  expect(pairLiquidity).to.be.eq(liquidityOut.toString());
  expect(await pair.lpFeeStored(maturity)).to.be.eq(0);
}

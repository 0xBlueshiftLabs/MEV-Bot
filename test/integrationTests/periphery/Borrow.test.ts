import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { BigNumber, ContractReceipt } from "ethers";
import { ethers, waffle } from "hardhat";
import {
  borrowGivenPercent,
  borrowGivenPercentETHAsset,
  borrowGivenPercentETHCollateral,
} from "../../utils/fixtures/Borrow";
import { DeploymentContext, createDeploymentContextFixture } from "../../utils/fixtures/Deploy";
import { newLiquidity, newLiquidityETHAsset, newLiquidityETHCollateral } from "../../utils/fixtures/Liquidity";
import { getEvent, now } from "../../utils/helper";
import { getBorrowState } from "../../utils/state";

const { solidity, loadFixture } = waffle;
chai.use(solidity);
const { expect } = chai;

const newLiquidityParams = {
  assetIn: ethers.utils.parseEther("10000"),
  debtIn: ethers.utils.parseEther("12000"),
  collateralIn: ethers.utils.parseEther("1000"),
};

const borrowGivenPercentParams = {
  assetOut: ethers.utils.parseEther("1000"),
  percent: BigNumber.from(1).shl(31), // 50% (2^31)
  maxDebt: ethers.utils.parseEther("2000"),
  maxCollateral: ethers.utils.parseEther("1000"),
};

let signers = [];

async function fixture(): Promise<DeploymentContext> {
  return await createDeploymentContextFixture(signers[0], signers[9].address);
}

describe("integration tests", () => {
  let maturity: BigNumber;
  before(async () => {
    signers = await ethers.getSigners();
    maturity = (await now()).add(BigNumber.from(315360000));
    await signers[1].sendTransaction({
      to: ethers.Wallet.createRandom().address,
      value: ethers.utils.parseEther("10000000000"),
    });
  });

  describe("borrow given percent", () => {
    it("given Borrow when borrowGivenPercent then credit position is minted", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await context.assetToken.mint(signers[1].address, borrowGivenPercentParams.assetOut);
      await context.collateralToken.mint(signers[1].address, borrowGivenPercentParams.maxCollateral);
      await context.assetToken.connect(signers[1]).approve(context.router.address, borrowGivenPercentParams.assetOut);
      await context.collateralToken
        .connect(signers[1])
        .approve(context.router.address, borrowGivenPercentParams.maxCollateral);
      await newLiquidity(context, maturity, newLiquidityParams, signers[0]);
      const beforeState = await getBorrowState(context, maturity, signers[1]);

      // WHEN
      const receipt = await borrowGivenPercent(context, maturity, borrowGivenPercentParams, signers[1]);

      // THEN
      await assertBorrow(context, maturity, receipt, beforeState, BigNumber.from(1), signers[1]);
    });

    it("given Borrow when borrowGivenPercentageETHAsset then credit position is minted", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await context.collateralToken.mint(signers[1].address, borrowGivenPercentParams.maxCollateral);
      await context.collateralToken
        .connect(signers[1])
        .approve(context.router.address, borrowGivenPercentParams.maxCollateral);
      await newLiquidityETHAsset(context, maturity, newLiquidityParams, signers[0]);
      const beforeState = await getBorrowState(context, maturity, signers[1], true);

      // WHEN
      const receipt = await borrowGivenPercentETHAsset(context, maturity, borrowGivenPercentParams, signers[1]);

      // THEN
      await assertBorrow(context, maturity, receipt, beforeState, BigNumber.from(1), signers[1], true);
    });

    it("given Borrow when borrowGivenPercentETHCollateral then credit position is minted", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await context.assetToken.mint(signers[1].address, borrowGivenPercentParams.assetOut);
      await context.assetToken.connect(signers[1]).approve(context.router.address, borrowGivenPercentParams.assetOut);
      await newLiquidityETHCollateral(context, maturity, newLiquidityParams, signers[0]);
      const beforeState = await getBorrowState(context, maturity, signers[1], false, true);

      // WHEN
      const receipt = await borrowGivenPercentETHCollateral(context, maturity, borrowGivenPercentParams, signers[1]);

      // THEN
      await assertBorrow(context, maturity, receipt, beforeState, BigNumber.from(1), signers[1], false, true);
    });
  });
});

async function assertBorrow(
  context: DeploymentContext,
  maturity: BigNumber,
  receipt: ContractReceipt,
  beforeState: any,
  creditPositionId: BigNumber,
  receiver: SignerWithAddress,
  isETHAsset = false,
  isETHCollateral = false
) {
  const currentState = await getBorrowState(context, maturity, receiver, isETHAsset, isETHCollateral);

  const maturityCP = await context.creditPosition.getMaturity(creditPositionId);
  const pairCP = await context.creditPosition.getPair(creditPositionId);
  const positionTypeCP = await context.creditPosition.getPositionType(creditPositionId);
  const wrappedContent = await context.creditPosition.getWrappedContent(creditPositionId);
  const cpDebtTokens = await context.creditPosition.getDebt(creditPositionId);

  const borrowEvent = getEvent(currentState.pairContract.interface, receipt, "Borrow");
  const assetOut = borrowEvent[0].args["assetOut"];
  const dueOut = borrowEvent[0].args["dueOut"];
  const feeIn = borrowEvent[0].args["feeIn"];
  const protocolFeeIn = borrowEvent[0].args["protocolFeeIn"];
  const stakingFeeIn = borrowEvent[0].args["stakingFeeIn"];
  const ldtId = borrowEvent[0].args["id"];
  const xDecrease = beforeState.constantProduct[0].sub(currentState.constantProduct[0]);

  // balance
  expect(currentState.userAssetBalance.sub(beforeState.userAssetBalance)).to.be.closeTo(
    assetOut,
    ethers.utils.parseEther("0.01")
  );
  expect(beforeState.userCollateralBalance.sub(currentState.userCollateralBalance)).to.be.closeTo(
    dueOut.collateral,
    ethers.utils.parseEther("0.01")
  );

  expect(beforeState.assetPairBalance.sub(currentState.assetPairBalance)).to.be.equal(assetOut);
  expect(currentState.collateralPairBalance.sub(beforeState.collateralPairBalance)).to.be.equal(dueOut.collateral);
  expect(beforeState.assetReservePair.sub(currentState.assetReservePair)).to.be.equal(xDecrease);
  expect(await currentState.lockedDebtContract.ownerOf(ldtId)).to.be.equal(context.creditPosition.address);
  expect(await currentState.lockedDebtContract.dueOf(ldtId)).to.be.deep.equal(dueOut);

  expect(currentState.constantProduct[0]).to.be.lt(beforeState.constantProduct[0]);
  expect(currentState.constantProduct[1]).to.be.gt(beforeState.constantProduct[1]);
  expect(currentState.constantProduct[2]).to.be.gt(beforeState.constantProduct[2]);
  expect(currentState.lpFeeStored).to.be.gt(beforeState.lpFeeStored);
  expect(await context.creditPosition.ownerOf(creditPositionId)).to.be.equal(receiver.address);

  // credit position
  expect(maturityCP).to.be.equal(maturity);
  expect(pairCP).to.be.equal(currentState.pairContract.address);
  expect(positionTypeCP).to.be.equal(2);
  expect(wrappedContent).to.have.lengthOf(1);
  expect(wrappedContent[0]).to.be.deep.equal(cpDebtTokens);
  expect(cpDebtTokens.tokenId).to.be.eq(ldtId);

  // pair
  expect(feeIn).to.be.equal(currentState.lpFeeStored.sub(beforeState.lpFeeStored));
  expect(protocolFeeIn).to.be.equal(currentState.protocolFeeStored.sub(beforeState.protocolFeeStored));
  expect(stakingFeeIn).to.be.equal(currentState.stakingFeeStored.sub(beforeState.stakingFeeStored));
}

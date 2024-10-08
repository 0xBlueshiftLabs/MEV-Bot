import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { BigNumber, ContractReceipt } from "ethers";
import { ethers, waffle } from "hardhat";
import { DeploymentContext, createDeploymentContextFixture } from "../../utils/fixtures/Deploy";
import { lendGivenPercent, lendGivenPercentETHAsset, lendGivenPercentETHCollateral } from "../../utils/fixtures/Lend";
import { newLiquidity, newLiquidityETHAsset, newLiquidityETHCollateral } from "../../utils/fixtures/Liquidity";
import { getEvent, now } from "../../utils/helper";
import { getLendState } from "../../utils/state";

const { solidity, loadFixture } = waffle;
chai.use(solidity);
const { expect } = chai;

const newLiquidityParams = {
  assetIn: ethers.utils.parseEther("10000"),
  debtIn: ethers.utils.parseEther("12000"),
  collateralIn: ethers.utils.parseEther("1000"),
};

const lendGivenLoanParams = {
  assetIn: ethers.utils.parseEther("1000"),
  loanOut: ethers.utils.parseEther("1010"),
  minCoverage: ethers.utils.parseEther("50"),
};

const lendGivenCoverageParams = {
  assetIn: ethers.utils.parseEther("1000"),
  coverageOut: ethers.utils.parseEther("50"),
  minLoan: ethers.utils.parseEther("1010"),
};

const lendGivenPercentParams = {
  assetIn: ethers.utils.parseEther("1000"),
  percent: BigNumber.from(2).pow(31), // 50%
  minCoverage: ethers.utils.parseEther("25"),
  minLoan: ethers.utils.parseEther("1010"),
};

let signers = [];

async function fixture(): Promise<DeploymentContext> {
  signers = await ethers.getSigners();
  return await createDeploymentContextFixture(signers[0], signers[9].address);
}

describe("integration tests", () => {
  let maturity: BigNumber;
  before(async () => {
    maturity = (await now()).add(BigNumber.from(315360000));
  });

  describe("lend given percent", () => {
    it("given LendGivenCoverage when lendGivenPercent then credit position is minted", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await context.assetToken.mint(signers[1].address, lendGivenPercentParams.assetIn);
      await context.collateralToken.mint(signers[1].address, lendGivenPercentParams.minLoan);
      await newLiquidity(context, maturity, newLiquidityParams, signers[0]);
      const beforeState = await getLendState(context, maturity, signers[1]);

      // WHEN
      await context.assetToken.connect(signers[1]).approve(context.router.address, lendGivenPercentParams.assetIn);
      await context.collateralToken.connect(signers[1]).approve(context.router.address, lendGivenPercentParams.minLoan);
      const receipt = await lendGivenPercent(context, maturity, lendGivenPercentParams, signers[1]);

      // THEN
      await assertLend(context, maturity, receipt, beforeState, BigNumber.from(1), signers[1]);
    });

    it("given LendGivenLoan when lendGivenPercentETHAsset then credit position is minted", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await context.collateralToken.mint(signers[1].address, lendGivenPercentParams.minLoan);
      await newLiquidityETHAsset(context, maturity, newLiquidityParams, signers[0]);
      const beforeState = await getLendState(context, maturity, signers[1], true);

      // WHEN
      await context.collateralToken.connect(signers[1]).approve(context.router.address, lendGivenPercentParams.minLoan);
      const receipt = await lendGivenPercentETHAsset(context, maturity, lendGivenPercentParams, signers[1]);

      // THEN
      await assertLend(context, maturity, receipt, beforeState, BigNumber.from(1), signers[1], true);
    });

    it("given LendGivenLoan when lendGivenPercentETHCollateral then credit position is minted", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await context.assetToken.mint(signers[1].address, lendGivenPercentParams.assetIn);
      await newLiquidityETHCollateral(context, maturity, newLiquidityParams, signers[0]);
      const beforeState = await getLendState(context, maturity, signers[1], false, true);

      // WHEN
      await context.assetToken.connect(signers[1]).approve(context.router.address, lendGivenPercentParams.assetIn);
      const receipt = await lendGivenPercentETHCollateral(context, maturity, lendGivenPercentParams, signers[1]);

      // THEN
      await assertLend(context, maturity, receipt, beforeState, BigNumber.from(1), signers[1], false, true);
    });
  });
});

async function assertLend(
  context: DeploymentContext,
  maturity: BigNumber,
  receipt: ContractReceipt,
  beforeState: any,
  creditPositionId: BigNumber,
  receiver: SignerWithAddress,
  isETHAsset = false,
  isETHCollateral = false
) {
  const currentState = await getLendState(context, maturity, receiver, isETHAsset, isETHCollateral);

  const maturityCP = await context.creditPosition.getMaturity(creditPositionId);
  const pairCP = await context.creditPosition.getPair(creditPositionId);
  const positionTypeCP = await context.creditPosition.getPositionType(creditPositionId);
  const wrappedContent = await context.creditPosition.getWrappedContent(creditPositionId);
  const cpCreditTokens = await context.creditPosition.getCredit(creditPositionId);

  const lendEvent = getEvent(currentState.pairContract.interface, receipt, "Lend");
  const assetIn = lendEvent[0].args["assetIn"];
  const loanTo = lendEvent[0].args["loanTo"];
  const coverageTo = lendEvent[0].args["coverageTo"];
  const claimsOut = lendEvent[0].args["claimsOut"];
  const feeIn = lendEvent[0].args["feeIn"];
  const protocolFeeIn = lendEvent[0].args["protocolFeeIn"];
  const stakingFeeIn = lendEvent[0].args["stakingFeeIn"];

  const xIncrease = currentState.constantProduct[0].sub(beforeState.constantProduct[0]);

  // balance
  expect(beforeState.userAssetBalance.sub(currentState.userAssetBalance)).to.be.closeTo(
    assetIn,
    ethers.utils.parseEther("0.01")
  );
  expect(currentState.assetPairBalance.sub(beforeState.assetPairBalance)).to.be.equal(assetIn);
  expect(currentState.assetReservePair.sub(beforeState.assetReservePair)).to.be.equal(xIncrease);
  expect(beforeState.loanPrincipalCPBalance.add(currentState.loanPrincipalCPBalance)).to.be.equal(
    claimsOut["loanPrincipal"]
  );
  expect(beforeState.loanInterestCPBalance.add(currentState.loanInterestCPBalance)).to.be.equal(
    claimsOut["loanInterest"]
  );
  expect(beforeState.coveragePrincipalCPBalance.add(currentState.coveragePrincipalCPBalance)).to.be.equal(
    claimsOut["coveragePrincipal"]
  );
  expect(beforeState.coverageInterestCPBalance.add(currentState.coverageInterestCPBalance)).to.be.equal(
    claimsOut["coverageInterest"]
  );
  expect(currentState.constantProduct[0]).to.be.gt(beforeState.constantProduct[0]);
  expect(currentState.constantProduct[1]).to.be.lt(beforeState.constantProduct[1]);
  expect(currentState.constantProduct[2]).to.be.lt(beforeState.constantProduct[2]);
  expect(currentState.lpFeeStored).to.be.gt(beforeState.lpFeeStored);
  expect(await context.creditPosition["ownerOf(uint256)"](creditPositionId)).to.be.equal(receiver.address);

  // credit position
  expect(maturityCP).to.be.equal(maturity);
  expect(pairCP).to.be.equal(currentState.pairContract.address);
  expect(positionTypeCP).to.be.equal(1);
  expect(wrappedContent).to.have.lengthOf(4);
  expect(wrappedContent).to.be.deep.equal(cpCreditTokens);

  // pair
  expect(loanTo).to.be.eq(context.router.address);
  expect(coverageTo).to.be.eq(context.router.address);
  expect(feeIn).to.be.equal(currentState.lpFeeStored.sub(beforeState.lpFeeStored));
  expect(protocolFeeIn).to.be.equal(currentState.protocolFeeStored.sub(beforeState.protocolFeeStored));
  expect(stakingFeeIn).to.be.equal(currentState.stakingFeeStored.sub(beforeState.stakingFeeStored));
}

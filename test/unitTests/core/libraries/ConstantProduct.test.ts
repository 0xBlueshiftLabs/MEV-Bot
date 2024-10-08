import chai from "chai";
import { ethers, waffle } from "hardhat";
import { ConstantProductTest } from "../../../../typechain/ConstantProductTest";
import ConstantProduct from "../../../utils/librariesCore/ConstantProduct";
import { expect } from "../../../utils/shared/Expect";

const { solidity } = waffle;
chai.use(solidity);

interface Token {
  asset: bigint;
  collateral: bigint;
}
interface Claims {
  loanPrincipal: bigint;
  loanInterest: bigint;
  coveragePrincipal: bigint;
  coverageInterest: bigint;
}
interface StateParams {
  reserves: Token;
  lpFeeStored: bigint;
  totalLiquidity: bigint;
  totalClaims: Claims;
  totalDebtCreated: bigint;
  x: bigint;
  y: bigint;
  z: bigint;
}
interface StateTestParams {
  asset: bigint;
  interest: bigint;
  cdp: bigint;
}

let constantProductTestContract: ConstantProductTest;

describe("Core#ConstantProduct", () => {
  beforeEach(async () => {
    const constantProductTestContactFactory = await ethers.getContractFactory("ConstantProductTest");
    constantProductTestContract = (await constantProductTestContactFactory.deploy()) as ConstantProductTest;
    await constantProductTestContract.deployed();
  });

  it("checkConstantProduct should reverted", async () => {
    let state: StateParams = {
      reserves: { asset: 10n, collateral: 10n },
      lpFeeStored: 2n,
      totalLiquidity: 10n,
      totalClaims: { loanPrincipal: 1n, loanInterest: 9n, coveragePrincipal: 1n, coverageInterest: 9n },
      totalDebtCreated: 10n,
      x: 1000n,
      y: 1000n,
      z: 1000n,
    };
    const stateTest: StateTestParams = {
      asset: 1000n,
      interest: 1000n,
      cdp: 1000n,
    };
    let assetReserve: bigint = 100n;
    let interestAdjusted: bigint = 100n;
    let cdpAdjusted: bigint = 100n;
    await expect(
      constantProductTestContract.checkConstantProduct(state, assetReserve, interestAdjusted, cdpAdjusted)
    ).to.be.revertedWith("E301");
    expect(ConstantProduct.checkConstantProduct(stateTest, assetReserve, interestAdjusted, cdpAdjusted)).to.be.false;
  });

  it("checkConstantProduct should return true", async () => {
    let state = {
      reserves: { asset: 100n, collateral: 100n },
      lpFeeStored: 2n,
      totalLiquidity: 10n,
      totalClaims: { loanPrincipal: 1n, loanInterest: 9n, coveragePrincipal: 1n, coverageInterest: 9n },
      totalDebtCreated: 10n,
      x: 20n,
      y: 10n,
      z: 1n,
    };
    let stateTest: StateTestParams = {
      asset: 20n,
      interest: 10n,
      cdp: 1n,
    };
    let assetReserve = 30n;
    let interestAdjusted = 10n;
    let cdpAdjusted = 1n << 32n;
    expect(await constantProductTestContract.checkConstantProduct(state, assetReserve, interestAdjusted, cdpAdjusted))
      .to.be.true;
    expect(ConstantProduct.checkConstantProduct(stateTest, assetReserve, interestAdjusted, cdpAdjusted)).to.be.true;
  });
});

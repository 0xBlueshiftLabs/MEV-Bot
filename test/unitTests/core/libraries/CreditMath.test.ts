import { BigNumberish } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { ethers, waffle } from "hardhat";
import { CreditMathTest, IPair } from "../../../../typechain/CreditMathTest";
import BorrowMath from "../../../utils/librariesCore/BorrowMath";
import BurnMath from "../../../utils/librariesCore/BurnMath";
import LendMath from "../../../utils/librariesCore/LendMath";
import MintMath from "../../../utils/librariesCore/MintMath";
import WithdrawMath from "../../../utils/librariesCore/WithdrawMath";
import { expect } from "../../../utils/shared/Expect";
import { now } from "../../../utils/shared/Helper";
import { State } from "../../../utils/shared/PairInterface";

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
  totalLiquidity: bigint;
  totalClaims: Claims;
  totalDebtCreated: bigint;
  x: bigint;
  y: bigint;
  z: bigint;
}

interface StateTestParams {
  reserves: Token;
  totalLiquidity: bigint;
  totalClaims: Claims;
  totalDebtCreated: bigint;
  asset: bigint;
  interest: bigint;
  cdp: bigint;
}

let state: IPair.StateStruct = {
  reserves: { asset: 0n, collateral: 0n },
  lpFeeStored: 1n,
  totalLiquidity: 0n,
  totalClaims: { loanPrincipal: 0n, loanInterest: 0n, coverageInterest: 0n, coveragePrincipal: 0n },
  totalDebtCreated: 0n,
  x: 100n,
  y: 10n,
  z: 1n,
};

let stateTest: State = {
  reserves: { asset: 0n, collateral: 0n },
  totalLiquidity: 0n,
  totalClaims: { loanPrincipal: 0n, loanInterest: 0n, coverageInterest: 0n, coveragePrincipal: 0n },
  totalDebtCreated: 0n,
  asset: 100n,
  interest: 10n,
  cdp: 1n,
  lpFeeStored: 1n,
};

let maturity: BigNumberish;
let assetIn: bigint = 1000n;
let interestIncrease: bigint = 30n;
let cdpIncrease: bigint = 2n;
let signers: SignerWithAddress[];

describe("Core#CreditMath", () => {
  let CreditMathTestContract: CreditMathTest;

  describe("Mint Math", () => {
    let liquidityOut: any;
    let feeStoredIncrease: any;
    let dueOut: any;

    describe("New Liquidity", () => {
      before("", async () => {
        signers = await ethers.getSigners();
        maturity = (await now()) + 10000n;
        const CreditMathContractFactory = await ethers.getContractFactory("CreditMath");
        const CreditMathContract = await CreditMathContractFactory.deploy();
        const CreditMathTestContractFactory = await ethers.getContractFactory("CreditMathTest", {
          libraries: {
            CreditMath: CreditMathContract.address,
          },
        });
        CreditMathTestContract = (await CreditMathTestContractFactory.deploy()) as CreditMathTest;
        await CreditMathTestContract.deployed();
        [liquidityOut, dueOut, feeStoredIncrease] = await CreditMathTestContract.mint(
          maturity,
          state,
          assetIn,
          interestIncrease,
          cdpIncrease
        );
      });

      it("LiquidityTotal, newLiquidity", async () => {
        const liquidityOutComputed = MintMath.getLiquidity1(assetIn);
        expect(liquidityOut.eq(liquidityOutComputed)).to.be.true;
      });

      it("Debt, newLiquidity", async () => {
        const debtComputed = MintMath.getDebt(maturity as bigint, assetIn, interestIncrease, await now());
        expect(dueOut[0].eq(debtComputed)).to.true;
      });

      it("Collateral, newLiquidity", async () => {
        const collateralComputed = MintMath.getCollateral(
          maturity as bigint,
          assetIn,
          interestIncrease,
          cdpIncrease,
          await now()
        );
        expect(dueOut[1].eq(collateralComputed)).to.true;
      });

      it("StartBlock, newLiquidity", async () => {
        const startBlockComputed = await ethers.provider.getBlockNumber();
        expect(dueOut[2]).to.equal(startBlockComputed);
      });

      it("Fee Stored, newLiquidity", async () => {
        const liquidityOutComputed = MintMath.getLiquidity1(assetIn);

        const feeStoredComputed = MintMath.getFee(stateTest, liquidityOutComputed as bigint);
        expect(feeStoredIncrease.eq(feeStoredComputed)).to.true;
      });
    });

    describe("Additional Liquidity", () => {
      before("", async () => {
        signers = await ethers.getSigners();
        maturity = (await now()) + 10000n;
        state.totalLiquidity = 50n;
        stateTest.totalLiquidity = 50n;
        const CreditMathContractFactory = await ethers.getContractFactory("CreditMath");
        const CreditMathContract = await CreditMathContractFactory.deploy();
        const CreditMathTestContractFactory = await ethers.getContractFactory("CreditMathTest", {
          libraries: {
            CreditMath: CreditMathContract.address,
          },
        });
        CreditMathTestContract = (await CreditMathTestContractFactory.deploy()) as CreditMathTest;
        await CreditMathTestContract.deployed();
        [liquidityOut, dueOut, feeStoredIncrease] = await CreditMathTestContract.mint(
          maturity,
          state,
          assetIn,
          interestIncrease,
          cdpIncrease
        );
      });

      it("LiquidityTotal, additional liquidity", async () => {
        const liquidityOutComputed = MintMath.getLiquidity2(stateTest, assetIn, interestIncrease, cdpIncrease);
        expect(liquidityOut.eq(liquidityOutComputed)).to.be.true;
      });

      it("Debt, additional liquidity", async () => {
        const debtComputed = MintMath.getDebt(maturity as bigint, assetIn, interestIncrease, await now());
        expect(dueOut[0].eq(debtComputed)).to.true;
      });

      it("Collateral, additional liquidity", async () => {
        const collateralComputed = MintMath.getCollateral(
          maturity as bigint,
          assetIn,
          interestIncrease,
          cdpIncrease,
          await now()
        );
        expect(dueOut[1].eq(collateralComputed)).to.true;
      });

      it("StartBlock, additional liquidity", async () => {
        const startBlockComputed = await ethers.provider.getBlockNumber();
        expect(dueOut[2]).to.equal(startBlockComputed);
      });

      it("Fee Stored, additional liquidity", async () => {
        const liquidityOutComputed = MintMath.getLiquidity2(stateTest, assetIn, interestIncrease, cdpIncrease);

        const feeStoredComputed = MintMath.getFee(stateTest, liquidityOutComputed as bigint);
        expect(feeStoredIncrease.eq(feeStoredComputed)).to.true;
      });
    });
  });

  describe("Burn Math", () => {
    let assetOut: BigNumberish;
    let collateralOut: BigNumberish;
    let feeOut: BigNumberish;
    let liquidityIn = 10n;

    describe("totalAssets > totalLoan", () => {
      before("", async () => {
        signers = await ethers.getSigners();
        maturity = (await now()) + 10000n;
        const CreditMathContractFactory = await ethers.getContractFactory("CreditMath");
        const CreditMathContract = await CreditMathContractFactory.deploy();
        const CreditMathTestContractFactory = await ethers.getContractFactory("CreditMathTest", {
          libraries: {
            CreditMath: CreditMathContract.address,
          },
        });
        CreditMathTestContract = (await CreditMathTestContractFactory.deploy()) as CreditMathTest;
        await CreditMathTestContract.deployed();
        state = {
          reserves: { asset: 100n, collateral: 100n },
          lpFeeStored: 1n,
          totalLiquidity: 100n,
          totalClaims: { loanPrincipal: 10n, loanInterest: 10n, coverageInterest: 10n, coveragePrincipal: 10n },
          totalDebtCreated: 100n,
          x: 100n,
          y: 10n,
          z: 1n,
        };
        stateTest = {
          reserves: { asset: 100n, collateral: 100n },
          totalLiquidity: 100n,
          totalClaims: { loanPrincipal: 10n, loanInterest: 10n, coverageInterest: 10n, coveragePrincipal: 10n },
          totalDebtCreated: 100n,
          asset: 100n,
          interest: 10n,
          cdp: 1n,
          lpFeeStored: 1n,
        };
        [assetOut, collateralOut, feeOut] = await CreditMathTestContract.burn(state, liquidityIn);
      });
      it("AssetOut", () => {
        const assetOutComputed = BurnMath.getAsset(stateTest, liquidityIn);
        expect(assetOut == assetOutComputed).to.true;
      });
      it("CollateralOut", () => {
        const collateralOutComputed = BurnMath.getCollateral(stateTest, liquidityIn);
        expect(collateralOut == collateralOutComputed).to.true;
      });
      it("FeeOut", () => {
        const feeOutComputed = BurnMath.getFee(stateTest, liquidityIn);
        expect(feeOut == feeOutComputed).to.true;
      });
    });

    describe("totalAsset == totalLoan", () => {
      before("", async () => {
        signers = await ethers.getSigners();
        maturity = (await now()) + 10000n;
        const CreditMathContractFactory = await ethers.getContractFactory("CreditMath");
        const CreditMathContract = await CreditMathContractFactory.deploy();
        const CreditMathTestContractFactory = await ethers.getContractFactory("CreditMathTest", {
          libraries: {
            CreditMath: CreditMathContract.address,
          },
        });
        CreditMathTestContract = (await CreditMathTestContractFactory.deploy()) as CreditMathTest;
        await CreditMathTestContract.deployed();
        state = {
          reserves: { asset: 100n, collateral: 100n },
          lpFeeStored: 1n,
          totalLiquidity: 100n,
          totalClaims: { loanPrincipal: 50n, loanInterest: 50n, coverageInterest: 10n, coveragePrincipal: 10n },
          totalDebtCreated: 100n,
          x: 100n,
          y: 10n,
          z: 1n,
        };
        stateTest = {
          reserves: { asset: 100n, collateral: 100n },
          totalLiquidity: 100n,
          totalClaims: { loanPrincipal: 50n, loanInterest: 50n, coverageInterest: 10n, coveragePrincipal: 10n },
          totalDebtCreated: 100n,
          asset: 100n,
          interest: 10n,
          cdp: 1n,
          lpFeeStored: 1n,
        };
        [assetOut, collateralOut, feeOut] = await CreditMathTestContract.burn(state, liquidityIn);
      });
      it("AssetOut", () => {
        const assetOutComputed = BurnMath.getAsset(stateTest, liquidityIn);
        expect(assetOut == assetOutComputed).to.true;
      });
      it("CollateralOut", () => {
        const collateralOutComputed = BurnMath.getCollateral(stateTest, liquidityIn);
        expect(collateralOut == collateralOutComputed).to.true;
      });
      it("FeeOut", () => {
        const feeOutComputed = BurnMath.getFee(stateTest, liquidityIn);
        expect(feeOut == feeOutComputed).to.true;
      });
    });

    describe("totalAsset < totalLoan", () => {
      before("", async () => {
        signers = await ethers.getSigners();
        maturity = (await now()) + 10000n;
        const CreditMathContractFactory = await ethers.getContractFactory("CreditMath");
        const CreditMathContract = await CreditMathContractFactory.deploy();
        const CreditMathTestContractFactory = await ethers.getContractFactory("CreditMathTest", {
          libraries: {
            CreditMath: CreditMathContract.address,
          },
        });
        CreditMathTestContract = (await CreditMathTestContractFactory.deploy()) as CreditMathTest;
        await CreditMathTestContract.deployed();
        state = {
          reserves: { asset: 90n, collateral: 100n },
          lpFeeStored: 1n,
          totalLiquidity: 100n,
          totalClaims: { loanPrincipal: 50n, loanInterest: 50n, coverageInterest: 10n, coveragePrincipal: 10n },
          totalDebtCreated: 100n,
          x: 100n,
          y: 10n,
          z: 1n,
        };
        stateTest = {
          reserves: { asset: 90n, collateral: 100n },
          totalLiquidity: 100n,
          totalClaims: { loanPrincipal: 50n, loanInterest: 50n, coverageInterest: 10n, coveragePrincipal: 10n },
          totalDebtCreated: 100n,
          asset: 100n,
          interest: 10n,
          cdp: 1n,
          lpFeeStored: 1n,
        };
        [assetOut, collateralOut, feeOut] = await CreditMathTestContract.burn(state, liquidityIn);
      });
      it("AssetOut", () => {
        const assetOutComputed = BurnMath.getAsset(stateTest, liquidityIn);
        expect(assetOut == assetOutComputed).to.true;
      });
      it("CollateralOut", () => {
        const collateralOutComputed = BurnMath.getCollateral(stateTest, liquidityIn);
        expect(collateralOut == collateralOutComputed).to.true;
      });
      it("FeeOut", () => {
        const feeOutComputed = BurnMath.getFee(stateTest, liquidityIn);
        expect(feeOut == feeOutComputed).to.true;
      });
    });

    describe("totalAsset < totalLoan; collateral*loan < deficit * totalCoverage", () => {
      before("", async () => {
        signers = await ethers.getSigners();
        maturity = (await now()) + 10000n;
        const CreditMathContractFactory = await ethers.getContractFactory("CreditMath");
        const CreditMathContract = await CreditMathContractFactory.deploy();
        const CreditMathTestContractFactory = await ethers.getContractFactory("CreditMathTest", {
          libraries: {
            CreditMath: CreditMathContract.address,
          },
        });
        CreditMathTestContract = (await CreditMathTestContractFactory.deploy()) as CreditMathTest;
        await CreditMathTestContract.deployed();
        state = {
          reserves: { asset: 90n, collateral: 100n },
          lpFeeStored: 1n,
          totalLiquidity: 100n,
          totalClaims: { loanPrincipal: 50n, loanInterest: 50n, coverageInterest: 1000n, coveragePrincipal: 1000n },
          totalDebtCreated: 100n,
          x: 100n,
          y: 10n,
          z: 1n,
        };
        stateTest = {
          reserves: { asset: 90n, collateral: 100n },
          totalLiquidity: 100n,
          totalClaims: { loanPrincipal: 50n, loanInterest: 50n, coverageInterest: 1000n, coveragePrincipal: 1000n },
          totalDebtCreated: 100n,
          asset: 100n,
          interest: 10n,
          cdp: 1n,
          lpFeeStored: 1n,
        };
        [assetOut, collateralOut, feeOut] = await CreditMathTestContract.burn(state, liquidityIn);
      });
      it("AssetOut", () => {
        const assetOutComputed = BurnMath.getAsset(stateTest, liquidityIn);
        expect(assetOut == assetOutComputed).to.true;
      });
      it("CollateralOut", () => {
        const collateralOutComputed = BurnMath.getCollateral(stateTest, liquidityIn);
        expect(collateralOut == collateralOutComputed).to.true;
      });
      it("FeeOut", () => {
        const feeOutComputed = BurnMath.getFee(stateTest, liquidityIn);
        expect(feeOut == feeOutComputed).to.true;
      });
    });
  });

  describe("Lend Math", () => {
    const state: IPair.StateStruct = {
      reserves: { asset: 10n, collateral: 10n },
      lpFeeStored: 10n,
      totalLiquidity: 10n,
      totalClaims: { loanPrincipal: 1n, loanInterest: 9n, coveragePrincipal: 1n, coverageInterest: 9n },
      totalDebtCreated: 10n,
      x: 10n,
      y: 10n,
      z: 10n,
    };
    const stateTest: StateTestParams = {
      reserves: { asset: 10n, collateral: 10n },
      totalLiquidity: 10n,
      totalClaims: { loanPrincipal: 1n, loanInterest: 9n, coveragePrincipal: 1n, coverageInterest: 9n },
      totalDebtCreated: 10n,
      asset: 10n,
      interest: 10n,
      cdp: 10n,
    };
    const xIncrease = 2000000000000n;
    const yDecrease = 1n;
    const zDecrease = 1n;
    const fee = 200n;
    const protocolFee = 100n;
    const stakingFee = 50n;
    let result: any;

    before("", async () => {
      signers = await ethers.getSigners();
      maturity = (await now()) + 10000n;
      const CreditMathContractFactory = await ethers.getContractFactory("CreditMath");
      const CreditMathContract = await CreditMathContractFactory.deploy();
      const CreditMathTestContractFactory = await ethers.getContractFactory("CreditMathTest", {
        libraries: {
          CreditMath: CreditMathContract.address,
        },
      });
      CreditMathTestContract = (await CreditMathTestContractFactory.deploy()) as CreditMathTest;
      await CreditMathTestContract.deployed();
      result = await CreditMathTestContract.lend(
        maturity,
        state,
        xIncrease,
        yDecrease,
        zDecrease,
        fee,
        protocolFee,
        stakingFee
      );
    });
    it("loanInterest", async () => {
      const loanInterest = LendMath.getLoanInterest(maturity as bigint, yDecrease, await now());
      expect(result[0].loanInterest.eq(loanInterest)).to.true;
    });
    it("coveragePrincipal", async () => {
      const coveragePrincipal = LendMath.getCoveragePrincipal(stateTest, xIncrease);
      expect(result[0].coveragePrincipal.eq(coveragePrincipal)).to.true;
    });
    it("coverageInterest", async () => {
      const coverageInterest = LendMath.getCoverageInterest(maturity as bigint, yDecrease, await now());
      expect(result[0].coverageInterest.eq(coverageInterest)).to.true;
    });
    it("Fees", async () => {
      const { feeStoredIncrease, protocolFeeStoredIncrease, stakingFeeStoredIncrease } = LendMath.getFees(
        maturity as bigint,
        xIncrease,
        fee,
        protocolFee,
        stakingFee,
        await now()
      );

      expect(result[1].eq(feeStoredIncrease)).to.true;
      expect(result[2].eq(protocolFeeStoredIncrease)).to.true;
      expect(result[3].eq(stakingFeeStoredIncrease)).to.true;
    });
  });

  describe("Withdraw Math", () => {
    describe("totalAssets > totalLoan", () => {
      const state = {
        reserves: { asset: 1000n, collateral: 1000n },
        totalLiquidity: 500n,
        totalClaims: { loanPrincipal: 100n, loanInterest: 100n, coverageInterest: 100n, coveragePrincipal: 100n },
        totalDebtCreated: 300n,
        x: 5000n,
        y: 10000n,
        z: 10000n,
        lpFeeStored: 10n,
      };
      const stateTest: State = {
        reserves: { asset: 1000n, collateral: 1000n },
        totalLiquidity: 500n,
        totalClaims: { loanPrincipal: 100n, loanInterest: 100n, coverageInterest: 100n, coveragePrincipal: 100n },
        totalDebtCreated: 300n,
        asset: 5000n,
        interest: 10000n,
        cdp: 10000n,
        lpFeeStored: 10n,
      };
      const claimsIn = {
        loanPrincipal: 10n,
        loanInterest: 10n,
        coverageInterest: 10n,
        coveragePrincipal: 10n,
      };
      let result: any;

      before("", async () => {
        signers = await ethers.getSigners();
        maturity = (await now()) + 10000n;
        const CreditMathContractFactory = await ethers.getContractFactory("CreditMath");
        const CreditMathContract = await CreditMathContractFactory.deploy();
        const CreditMathTestContractFactory = await ethers.getContractFactory("CreditMathTest", {
          libraries: {
            CreditMath: CreditMathContract.address,
          },
        });
        CreditMathTestContract = (await CreditMathTestContractFactory.deploy()) as CreditMathTest;
        await CreditMathTestContract.deployed();

        result = await CreditMathTestContract.withdraw(state, claimsIn);
      });
      it("tokens out", () => {
        const tokensOut = WithdrawMath.getTokensOut(stateTest, claimsIn);
        expect(result[0].eq(tokensOut.asset)).to.true;
        expect(result[1].eq(tokensOut.collateral)).to.true;
      });
    });

    describe("totalAssets == totalLoan", () => {
      const state = {
        reserves: { asset: 1000n, collateral: 1000n },
        totalLiquidity: 500n,
        totalClaims: { loanPrincipal: 500n, loanInterest: 500n, coverageInterest: 100n, coveragePrincipal: 100n },
        totalDebtCreated: 300n,
        x: 5000n,
        y: 10000n,
        z: 10000n,
        lpFeeStored: 10n,
      };
      const stateTest: State = {
        reserves: { asset: 1000n, collateral: 1000n },
        totalLiquidity: 500n,
        totalClaims: { loanPrincipal: 500n, loanInterest: 500n, coverageInterest: 100n, coveragePrincipal: 100n },
        totalDebtCreated: 300n,
        asset: 5000n,
        interest: 10000n,
        cdp: 10000n,
        lpFeeStored: 10n,
      };
      const claimsIn = {
        loanPrincipal: 10n,
        loanInterest: 10n,
        coverageInterest: 10n,
        coveragePrincipal: 10n,
      };
      let result: any;

      before("", async () => {
        signers = await ethers.getSigners();
        maturity = (await now()) + 10000n;
        const CreditMathContractFactory = await ethers.getContractFactory("CreditMath");
        const CreditMathContract = await CreditMathContractFactory.deploy();
        const CreditMathTestContractFactory = await ethers.getContractFactory("CreditMathTest", {
          libraries: {
            CreditMath: CreditMathContract.address,
          },
        });
        CreditMathTestContract = (await CreditMathTestContractFactory.deploy()) as CreditMathTest;
        await CreditMathTestContract.deployed();
        result = await CreditMathTestContract.withdraw(state, claimsIn);
      });
      it("tokens out", () => {
        const tokensOut = WithdrawMath.getTokensOut(stateTest, claimsIn);
        expect(result[0].eq(tokensOut.asset)).to.true;
        expect(result[1].eq(tokensOut.collateral)).to.true;
      });
    });

    describe("totalAssets < totalLoan; totalAsset > LoanPrincipal", () => {
      const state = {
        reserves: { asset: 900n, collateral: 1000n },
        totalLiquidity: 500n,
        totalClaims: { loanPrincipal: 500n, loanInterest: 500n, coverageInterest: 100n, coveragePrincipal: 100n },
        totalDebtCreated: 300n,
        x: 5000n,
        y: 10000n,
        z: 10000n,
        lpFeeStored: 10n,
      };
      const stateTest: State = {
        reserves: { asset: 900n, collateral: 1000n },
        totalLiquidity: 500n,
        totalClaims: { loanPrincipal: 500n, loanInterest: 500n, coverageInterest: 100n, coveragePrincipal: 100n },
        totalDebtCreated: 300n,
        asset: 5000n,
        interest: 10000n,
        cdp: 10000n,
        lpFeeStored: 10n,
      };
      const claimsIn = {
        loanPrincipal: 10n,
        loanInterest: 10n,
        coverageInterest: 10n,
        coveragePrincipal: 10n,
      };
      let result: any;

      before("", async () => {
        signers = await ethers.getSigners();
        maturity = (await now()) + 10000n;
        const CreditMathContractFactory = await ethers.getContractFactory("CreditMath");
        const CreditMathContract = await CreditMathContractFactory.deploy();
        const CreditMathTestContractFactory = await ethers.getContractFactory("CreditMathTest", {
          libraries: {
            CreditMath: CreditMathContract.address,
          },
        });
        CreditMathTestContract = (await CreditMathTestContractFactory.deploy()) as CreditMathTest;
        await CreditMathTestContract.deployed();
        result = await CreditMathTestContract.withdraw(state, claimsIn);
      });
      it("tokens out", () => {
        const tokensOut = WithdrawMath.getTokensOut(stateTest, claimsIn);
        expect(result[0].eq(tokensOut.asset)).to.true;
        expect(result[1].eq(tokensOut.collateral)).to.true;
      });
    });

    describe("totalAssets < totalLoan; totalAsset < LoanPrincipal", () => {
      const state = {
        reserves: { asset: 900n, collateral: 1000n },
        totalLiquidity: 500n,
        totalClaims: { loanPrincipal: 1000n, loanInterest: 500n, coverageInterest: 100n, coveragePrincipal: 100n },
        totalDebtCreated: 300n,
        x: 5000n,
        y: 10000n,
        z: 10000n,
        lpFeeStored: 10n,
      };
      const stateTest: State = {
        reserves: { asset: 900n, collateral: 1000n },
        totalLiquidity: 500n,
        totalClaims: { loanPrincipal: 1000n, loanInterest: 500n, coverageInterest: 100n, coveragePrincipal: 100n },
        totalDebtCreated: 300n,
        asset: 5000n,
        interest: 10000n,
        cdp: 10000n,
        lpFeeStored: 10n,
      };
      const claimsIn = {
        loanPrincipal: 10n,
        loanInterest: 10n,
        coverageInterest: 10n,
        coveragePrincipal: 10n,
      };
      let result: any;

      before("", async () => {
        signers = await ethers.getSigners();
        maturity = (await now()) + 10000n;
        const CreditMathContractFactory = await ethers.getContractFactory("CreditMath");
        const CreditMathContract = await CreditMathContractFactory.deploy();
        const CreditMathTestContractFactory = await ethers.getContractFactory("CreditMathTest", {
          libraries: {
            CreditMath: CreditMathContract.address,
          },
        });
        CreditMathTestContract = (await CreditMathTestContractFactory.deploy()) as CreditMathTest;
        await CreditMathTestContract.deployed();
        result = await CreditMathTestContract.withdraw(state, claimsIn);
      });
      it("tokens out", () => {
        const tokensOut = WithdrawMath.getTokensOut(stateTest, claimsIn);
        expect(result[0].eq(tokensOut.asset)).to.true;
        expect(result[1].eq(tokensOut.collateral)).to.true;
      });
    });

    describe("totalAssets < totalLoan; totalAsset < LoanPrincipal; totalCollateral > totalCoverage", () => {
      const state = {
        reserves: { asset: 900n, collateral: 900n },
        totalLiquidity: 500n,
        totalClaims: { loanPrincipal: 1000n, loanInterest: 500n, coverageInterest: 100n, coveragePrincipal: 100n },
        totalDebtCreated: 300n,
        x: 5000n,
        y: 10000n,
        z: 10000n,
        lpFeeStored: 10n,
      };
      const stateTest: State = {
        reserves: { asset: 900n, collateral: 900n },
        totalLiquidity: 500n,
        totalClaims: { loanPrincipal: 1000n, loanInterest: 500n, coverageInterest: 100n, coveragePrincipal: 100n },
        totalDebtCreated: 300n,
        asset: 5000n,
        interest: 10000n,
        cdp: 10000n,
        lpFeeStored: 10n,
      };
      const claimsIn = {
        loanPrincipal: 10n,
        loanInterest: 10n,
        coverageInterest: 10n,
        coveragePrincipal: 10n,
      };
      let result: any;

      before("", async () => {
        signers = await ethers.getSigners();
        maturity = (await now()) + 10000n;
        const CreditMathContractFactory = await ethers.getContractFactory("CreditMath");
        const CreditMathContract = await CreditMathContractFactory.deploy();
        const CreditMathTestContractFactory = await ethers.getContractFactory("CreditMathTest", {
          libraries: {
            CreditMath: CreditMathContract.address,
          },
        });
        CreditMathTestContract = (await CreditMathTestContractFactory.deploy()) as CreditMathTest;
        await CreditMathTestContract.deployed();
        result = await CreditMathTestContract.withdraw(state, claimsIn);
      });
      it("tokens out", () => {
        const tokensOut = WithdrawMath.getTokensOut(stateTest, claimsIn);
        expect(result[0].eq(tokensOut.asset)).to.true;
        expect(result[1].eq(tokensOut.collateral)).to.true;
      });
    });

    describe("totalAssets < totalLoan; totalAsset < LoanPrincipal; totalCollateral < totalCoverage; totalCollateral > totalCoveragePrincipal", () => {
      const state = {
        reserves: { asset: 999n, collateral: 900n },
        totalLiquidity: 500n,
        totalClaims: { loanPrincipal: 1000n, loanInterest: 1n, coverageInterest: 2n, coveragePrincipal: 450449n },
        totalDebtCreated: 300n,
        x: 5000n,
        y: 10000n,
        z: 10000n,
        lpFeeStored: 10n,
      };
      const stateTest: State = {
        reserves: { asset: 999n, collateral: 900n },
        totalLiquidity: 500n,
        totalClaims: { loanPrincipal: 1000n, loanInterest: 1n, coverageInterest: 2n, coveragePrincipal: 450449n },
        totalDebtCreated: 300n,
        asset: 5000n,
        interest: 10000n,
        cdp: 10000n,
        lpFeeStored: 10n,
      };
      const claimsIn = {
        loanPrincipal: 10n,
        loanInterest: 10n,
        coverageInterest: 10n,
        coveragePrincipal: 10n,
      };
      let result: any;

      before("", async () => {
        signers = await ethers.getSigners();
        maturity = (await now()) + 10000n;
        const CreditMathContractFactory = await ethers.getContractFactory("CreditMath");
        const CreditMathContract = await CreditMathContractFactory.deploy();
        const CreditMathTestContractFactory = await ethers.getContractFactory("CreditMathTest", {
          libraries: {
            CreditMath: CreditMathContract.address,
          },
        });
        CreditMathTestContract = (await CreditMathTestContractFactory.deploy()) as CreditMathTest;
        await CreditMathTestContract.deployed();
        result = await CreditMathTestContract.withdraw(state, claimsIn);
      });

      it("tokens out", () => {
        const tokensOut = WithdrawMath.getTokensOut(stateTest, claimsIn);
        expect(result[0].eq(tokensOut.asset)).to.true;
        expect(result[1].eq(tokensOut.collateral)).to.true;
      });
    });

    describe("totalAssets < totalLoan; totalAsset < LoanPrincipal; totalCollateral < totalCoverage; totalCollateral < CoveragePrincipal", () => {
      const state = {
        reserves: { asset: 999n, collateral: 900n },
        totalLiquidity: 500n,
        totalClaims: { loanPrincipal: 1000n, loanInterest: 1n, coverageInterest: 10n, coveragePrincipal: 450451n },
        totalDebtCreated: 300n,
        x: 5000n,
        y: 10000n,
        z: 10000n,
        lpFeeStored: 10n,
      };
      const stateTest: State = {
        reserves: { asset: 999n, collateral: 900n },
        totalLiquidity: 500n,
        totalClaims: { loanPrincipal: 1000n, loanInterest: 1n, coverageInterest: 10n, coveragePrincipal: 450451n },
        totalDebtCreated: 300n,
        asset: 5000n,
        interest: 10000n,
        cdp: 10000n,
        lpFeeStored: 10n,
      };
      const claimsIn = {
        loanPrincipal: 10n,
        loanInterest: 10n,
        coverageInterest: 10n,
        coveragePrincipal: 10n,
      };
      let result: any;

      before("", async () => {
        signers = await ethers.getSigners();
        maturity = (await now()) + 10000n;
        const CreditMathContractFactory = await ethers.getContractFactory("CreditMath");
        const CreditMathContract = await CreditMathContractFactory.deploy();
        const CreditMathTestContractFactory = await ethers.getContractFactory("CreditMathTest", {
          libraries: {
            CreditMath: CreditMathContract.address,
          },
        });
        CreditMathTestContract = (await CreditMathTestContractFactory.deploy()) as CreditMathTest;
        await CreditMathTestContract.deployed();
        result = await CreditMathTestContract.withdraw(state, claimsIn);
      });
      it("tokens out", () => {
        const tokensOut = WithdrawMath.getTokensOut(stateTest, claimsIn);
        expect(result[0].eq(tokensOut.asset)).to.true;
        expect(result[1].eq(tokensOut.collateral)).to.true;
      });
    });
  });

  describe("Borrow Math", () => {
    const state: IPair.StateStruct = {
      reserves: { asset: 1000n, collateral: 1000n },
      lpFeeStored: 10n,
      totalLiquidity: 100n,
      totalClaims: { loanPrincipal: 10n, loanInterest: 90n, coveragePrincipal: 10n, coverageInterest: 90n },
      totalDebtCreated: 100n,
      x: 1000n,
      y: 1n,
      z: 1n,
    };
    const stateTest: State = {
      reserves: { asset: 1000n, collateral: 1000n },
      totalLiquidity: 100n,
      totalClaims: { loanPrincipal: 10n, loanInterest: 90n, coveragePrincipal: 10n, coverageInterest: 90n },
      totalDebtCreated: 100n,
      asset: 1000n,
      interest: 1n,
      cdp: 1n,
      lpFeeStored: 10n,
    };
    const xDecrease = 200n;
    const yIncrease = 1n;
    const zIncrease = 1n;
    const fee = 2n;
    const protocolFee = 1n;
    const stakingFee = 1n;
    let result: any;

    before("", async () => {
      signers = await ethers.getSigners();
      maturity = (await now()) + 10000n;
      const CreditMathContractFactory = await ethers.getContractFactory("CreditMath");
      const CreditMathContract = await CreditMathContractFactory.deploy();
      const CreditMathTestContractFactory = await ethers.getContractFactory("CreditMathTest", {
        libraries: {
          CreditMath: CreditMathContract.address,
        },
      });
      CreditMathTestContract = (await CreditMathTestContractFactory.deploy()) as CreditMathTest;
      await CreditMathTestContract.deployed();
      result = await CreditMathTestContract.borrow(
        maturity,
        state,
        xDecrease,
        yIncrease,
        zIncrease,
        fee,
        protocolFee,
        stakingFee
      );
    });
    it("debt", async () => {
      const debt = BorrowMath.getDebt(maturity as bigint, xDecrease, yIncrease, await now());
      expect(result[0].debt.eq(debt)).to.true;
    });
    it("collateral", async () => {
      const collateral = BorrowMath.getCollateral(maturity as bigint, stateTest, xDecrease, zIncrease, await now());
      expect(result[0].collateral.eq(collateral)).to.true;
    });
  });
});

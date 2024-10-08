import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, unstakingPenalty } from "../../utils/fixtures/token/CreditStaking";
import { advanceTime, setTime } from "../../utils/helper";

const { solidity } = waffle;
chai.use(solidity);
const { expect } = chai;

const WEEK = BigNumber.from(604800);
const HALF_WEEK = WEEK.div(2);
const MONTH = BigNumber.from(2629743);
const HALF_MONTH = MONTH.div(2);
const dividends = ethers.utils.parseEther("100");

describe("unit tests", () => {
  let startTime: BigNumber;
  let owner: SignerWithAddress;
  let staker1: SignerWithAddress;
  let staker2: SignerWithAddress;
  let snapshot;

  before(async () => {
    [owner, staker1, staker2] = await ethers.getSigners();
    // sending out some eth as stakers have the max amount of eth in their balance
    await staker1.sendTransaction({
      value: ethers.utils.parseEther("10000000"),
      to: ethers.constants.AddressZero,
    });
  });

  beforeEach(async () => {
    startTime = BigNumber.from((await ethers.provider.getBlock("latest")).timestamp).add(MONTH);
    // take a snapshot of the evm
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    // reset the evm
    await ethers.provider.send("evm_revert", [snapshot]);
  });

  describe("CreditStaking", () => {
    describe("initialization", () => {
      it("when contract deployment then all variables are initialized", async () => {
        // WHEN
        const context = await deploy(startTime);

        const cycleDurationSeconds = await context.creditStaking.cycleDurationSeconds();
        const distributedTokensLength = await context.creditStaking.distributedTokensLength();
        const distributedTokens = await context.creditStaking.distributedTokens();

        const distributedToken1 = await context.creditStaking.distributedToken(0);
        const distributedToken2 = await context.creditStaking.distributedToken(1);

        const nextCycleStartTime = await context.creditStaking.nextCycleStartTime();

        const unstakingPenalties0 = await context.creditStaking.unstakingPenalties(0);
        const unstakingPenalties1 = await context.creditStaking.unstakingPenalties(1);
        const unstakingPenalties2 = await context.creditStaking.unstakingPenalties(2);
        const unstakingPenalties3 = await context.creditStaking.unstakingPenalties(3);

        // THEN
        expect(cycleDurationSeconds).to.equal(MONTH);
        expect(distributedTokensLength).to.equal(3);
        expect(distributedTokens).to.deep.equal([
          context.creditToken.address,
          context.tknToken.address,
          context.weth.address,
        ]);
        expect(distributedToken1).to.equal(context.creditToken.address);
        expect(distributedToken2).to.equal(context.tknToken.address);
        expect(nextCycleStartTime).to.equal(context.startTime.add(MONTH));
        expect(unstakingPenalties0).to.equal(0);
        expect(unstakingPenalties1).to.equal(2500);
        expect(unstakingPenalties2).to.equal(5000);
        expect(unstakingPenalties3).to.equal(7500);
      });

      it("given past epoch when updateCurrentCycleStartTime then currentCycleStartTime is updated", async () => {
        // GIVEN
        const context = await deploy(startTime);
        await setTime(context.startTime);
        await advanceTime(MONTH);

        // WHEN
        await context.creditStaking.updateCurrentCycleStartTime();

        // THEN
        const currentCycleStartTime = await context.creditStaking.currentCycleStartTime();
        expect(currentCycleStartTime).to.equal(context.startTime.add(MONTH));
      });

      it("given reward token when addDividendsToPending then pending amount is increased", async () => {
        // GIVEN
        const context = await deploy(startTime);
        await context.tknToken.approve(context.creditStaking.address, dividends);
        await context.creditStaking.addDividendsToPending(context.tknToken.address, dividends);

        // WHEN
        const pendingStable = (await context.creditStaking.dividendsInfo(context.tknToken.address)).pendingAmount;
        await context.creditStaking.updateCurrentCycleStartTime();

        // THEN
        expect(pendingStable).to.be.eq(dividends);
      });

      it("when updateDividendsInfo then dividendsInfo is updated", async () => {
        // GIVEN
        const context = await deploy(startTime);
        await context.tknToken.approve(context.creditStaking.address, dividends);
        await context.creditStaking.addDividendsToPending(context.tknToken.address, dividends);
        await setTime(context.startTime);

        // WHEN
        await context.creditStaking.updateDividendsInfo(context.tknToken.address);

        // THEN
        const stableDividendsInfo = await context.creditStaking.dividendsInfo(context.tknToken.address);
        expect(stableDividendsInfo.pendingAmount).to.be.eq(dividends);
        expect(stableDividendsInfo.currentDistributionAmount).to.be.eq(0);
        expect(stableDividendsInfo.currentCycleDistributedAmount).to.be.eq(0);
        expect(stableDividendsInfo.distributedAmount).to.be.eq(0);
      });
    });

    describe("stake and harvest", () => {
      it("when stake then creditStaking balance is increased and user info is updated", async () => {
        // GIVEN
        const context = await deploy(startTime);
        await context.tknToken.approve(context.creditStaking.address, dividends);
        await context.creditStaking.addDividendsToPending(context.tknToken.address, dividends);
        await context.creditToken.connect(owner).transfer(staker1.address, dividends);
        await context.creditToken.connect(staker1).approve(context.creditStaking.address, dividends);
        await context.creditStaking.connect(staker1).stake(dividends);
        await setTime(context.startTime);

        // WHEN
        await context.creditStaking.updateDividendsInfo(context.tknToken.address);

        // THEN
        const stableDividendsInfo = await context.creditStaking.dividendsInfo(context.tknToken.address);
        expect(stableDividendsInfo.pendingAmount).to.be.eq(0);
        expect(stableDividendsInfo.currentDistributionAmount).to.be.eq(dividends);
        expect(stableDividendsInfo.currentCycleDistributedAmount).to.be.gt(0);
        expect(stableDividendsInfo.distributedAmount).to.be.eq(0);

        const userInfo = await context.creditStaking.users(context.tknToken.address, staker1.address);
        expect(userInfo.pendingDividends).to.be.eq(0);
        expect(userInfo.rewardDebt).to.be.eq(0);
        expect(await context.creditStaking.usersAllocation(staker1.address)).to.be.eq(dividends);
        expect(await context.creditStaking.totalAllocation()).to.be.eq(dividends);
        expect(await context.creditStaking.totalAllocation()).to.be.eq(dividends);
      });

      it("given 2 dividends tokens and 1 staker when harvestAllDividends at epoch n then user gets rewards (both tokens)", async () => {
        // GIVEN
        const context = await deploy(startTime);
        await context.tknToken.approve(context.creditStaking.address, dividends);
        await context.creditToken.approve(context.creditStaking.address, dividends);
        await context.creditStaking.addDividendsToPending(context.tknToken.address, dividends);
        await context.creditStaking.addDividendsToPending(context.creditToken.address, dividends);
        await context.creditToken.connect(owner).transfer(staker1.address, dividends);
        await context.creditToken.connect(staker1).approve(context.creditStaking.address, dividends);
        await context.creditStaking.connect(staker1).stake(dividends);
        await setTime(context.startTime);

        // WHEN
        await advanceTime(HALF_MONTH);
        const usdcBalanceBefore = await context.tknToken.balanceOf(staker1.address);
        const creditBalanceBefore = await context.creditToken.balanceOf(staker1.address);
        await context.creditStaking.connect(staker1).harvestAllDividends(false);

        // THEN
        const stableDividendsInfo = await context.creditStaking.dividendsInfo(context.tknToken.address);
        const creditDividendsInfo = await context.creditStaking.dividendsInfo(context.creditToken.address);
        const usdcDividends = dividends.mul(stableDividendsInfo.accDividendsPerShare).div(ethers.constants.WeiPerEther);
        const creditDividends = dividends
          .mul(creditDividendsInfo.accDividendsPerShare)
          .div(ethers.constants.WeiPerEther);

        const userInfo = await context.creditStaking.users(context.tknToken.address, staker1.address);
        expect(userInfo.pendingDividends).to.be.eq(0);
        expect(userInfo.rewardDebt).to.be.eq(usdcDividends);

        const usdcBalanceAfter = await context.tknToken.balanceOf(staker1.address);
        const creditBalanceAfter = await context.creditToken.balanceOf(staker1.address);
        expect(usdcBalanceAfter.sub(usdcBalanceBefore)).to.be.eq(usdcDividends);
        expect(creditBalanceAfter.sub(creditBalanceBefore)).to.be.eq(creditDividends);
      });

      it("given 2 dividends and 2 stakers when harvestAllDividends at epoch n+1 then user gets rewards (both tokens)", async () => {
        // GIVEN
        const context = await deploy(startTime);
        await context.tknToken.approve(context.creditStaking.address, dividends);
        await context.creditToken.approve(context.creditStaking.address, dividends);
        await context.creditStaking.addDividendsToPending(context.tknToken.address, dividends);
        await context.creditStaking.addDividendsToPending(context.creditToken.address, dividends);
        await context.creditToken.connect(owner).transfer(staker1.address, dividends);
        await context.creditToken.connect(owner).transfer(staker2.address, dividends);

        await context.creditToken.connect(staker1).approve(context.creditStaking.address, dividends);
        await context.creditStaking.connect(staker1).stake(dividends);

        await context.creditToken.connect(staker2).approve(context.creditStaking.address, dividends);
        await context.creditStaking.connect(staker2).stake(dividends);

        await setTime(startTime); // epoch 0
        await advanceTime(HALF_MONTH);

        // WHEN
        const usdcBalanceBefore1 = await context.tknToken.balanceOf(staker1.address);
        const creditBalanceBefore1 = await context.creditToken.balanceOf(staker1.address);

        const usdcBalanceBefore2 = await context.tknToken.balanceOf(staker2.address);
        const creditBalanceBefore2 = await context.creditToken.balanceOf(staker2.address);
        await advanceTime(HALF_MONTH); // epoch 1
        await context.creditStaking.updateDividendsInfo(context.tknToken.address);
        await context.creditStaking.updateDividendsInfo(context.creditToken.address);

        await context.creditStaking.connect(staker1).harvestAllDividends(false);
        await context.creditStaking.connect(staker2).harvestAllDividends(false);

        // THEN
        const stableDividendsInfo = await context.creditStaking.dividendsInfo(context.tknToken.address);
        const creditDividendsInfo = await context.creditStaking.dividendsInfo(context.creditToken.address);
        const usdcDividends = dividends.mul(stableDividendsInfo.accDividendsPerShare).div(ethers.constants.WeiPerEther);
        const creditDividends = dividends
          .mul(creditDividendsInfo.accDividendsPerShare)
          .div(ethers.constants.WeiPerEther);

        const usdcBalanceAfter1 = await context.tknToken.balanceOf(staker1.address);
        const creditBalanceAfter1 = await context.creditToken.balanceOf(staker1.address);
        expect(usdcBalanceAfter1.sub(usdcBalanceBefore1)).to.be.closeTo(
          usdcDividends,
          ethers.utils.parseEther("0.001")
        );
        expect(creditBalanceAfter1.sub(creditBalanceBefore1)).to.be.closeTo(
          creditDividends,
          ethers.utils.parseEther("0.001")
        );
        expect(usdcBalanceAfter1).to.be.gt(0);
        expect(creditBalanceAfter1).to.be.gt(0);

        const usdcBalanceAfter2 = await context.tknToken.balanceOf(staker2.address);
        const creditBalanceAfter2 = await context.creditToken.balanceOf(staker2.address);
        expect(usdcBalanceAfter2.sub(usdcBalanceBefore2)).to.be.closeTo(
          usdcDividends,
          ethers.utils.parseEther("0.001")
        );
        expect(creditBalanceAfter2.sub(creditBalanceBefore2)).to.be.closeTo(
          creditDividends,
          ethers.utils.parseEther("0.001")
        );
        expect(usdcBalanceAfter2).to.be.gt(0);
        expect(creditBalanceAfter2).to.be.gt(0);

        expect(await context.creditStaking.totalAllocation()).to.be.eq(dividends.mul(2));
      });

      it("given weth dividends when harvestDividends at epoch n then user gets rewards in eth", async () => {
        // GIVEN
        const context = await deploy(startTime);
        await context.weth.deposit({ value: ethers.utils.parseEther("100000000") });
        await context.weth.approve(context.creditStaking.address, dividends);
        await context.creditStaking.connect(owner).addDividendsToPending(context.weth.address, dividends);
        await context.creditToken.connect(owner).transfer(staker1.address, dividends);
        await context.creditToken.connect(staker1).approve(context.creditStaking.address, dividends);
        await context.creditStaking.connect(staker1).stake(dividends);
        await setTime(context.startTime);

        // WHEN
        await advanceTime(HALF_MONTH);
        const ethBalanceBefore = await ethers.provider.getBalance(staker1.address);
        await context.creditStaking.connect(staker1).harvestDividends(context.weth.address, true);

        // THEN
        const wethDividendsInfo = await context.creditStaking.dividendsInfo(context.weth.address);
        const wethDividends = dividends.mul(wethDividendsInfo.accDividendsPerShare).div(ethers.constants.WeiPerEther);

        const userInfo = await context.creditStaking.users(context.weth.address, staker1.address);
        expect(userInfo.pendingDividends).to.be.eq(0);
        expect(userInfo.rewardDebt).to.be.eq(wethDividends);

        const ethBalanceAfter = await ethers.provider.getBalance(staker1.address);
        expect(ethBalanceAfter.sub(ethBalanceBefore)).to.be.closeTo(wethDividends, ethers.utils.parseEther("0.001"));
      });

      it("fails when non weth harvestDividend with receipt token true", async () => {
        // GIVEN
        const context = await deploy(startTime);
        await context.weth.deposit({ value: ethers.utils.parseEther("100000000") });
        await context.weth.approve(context.creditStaking.address, dividends);
        await context.creditStaking.connect(owner).addDividendsToPending(context.weth.address, dividends);
        await context.creditToken.connect(owner).transfer(staker1.address, dividends);
        await context.creditToken.connect(staker1).approve(context.creditStaking.address, dividends);
        await context.creditStaking.connect(staker1).stake(dividends);
        await setTime(context.startTime);

        // WHEN
        await advanceTime(HALF_MONTH);
        await expect(
          context.creditStaking.connect(staker1).harvestDividends(context.tknToken.address, true)
        ).to.be.revertedWith("E1315");
      });
    });

    describe("unstake", () => {
      it("given first week when unstake then get the funds and fees go to the treasury address", async () => {
        // GIVEN
        const context = await deploy(startTime);
        await context.tknToken.approve(context.creditStaking.address, dividends);
        await context.creditStaking.addDividendsToPending(context.tknToken.address, dividends);
        await context.creditToken.connect(owner).transfer(staker1.address, dividends);
        await context.creditToken.connect(staker1).approve(context.creditStaking.address, dividends);
        await context.creditStaking.connect(staker1).stake(dividends);
        expect(await context.creditStaking.totalAllocation()).to.be.eq(dividends);
        await setTime(context.startTime);

        // WHEN
        await context.creditStaking.connect(staker1).unstake(dividends);
        // THEN
        const penalty = await unstakingPenalty(context);
        const fees = dividends.mul(penalty).div(10000);
        const amountReceived = dividends.sub(fees);
        expect(await context.creditToken.balanceOf(staker1.address)).to.be.eq(amountReceived);
        expect(await context.creditToken.balanceOf(context.treasury)).to.be.eq(fees);
        expect(await context.creditStaking.totalAllocation()).to.be.eq(0);
      });

      it("given second week when unstake then get the funds and fees go to the treasury address", async () => {
        // GIVEN
        const context = await deploy(startTime);
        await context.tknToken.approve(context.creditStaking.address, dividends);
        await context.creditStaking.addDividendsToPending(context.tknToken.address, dividends);
        await context.creditToken.connect(owner).transfer(staker1.address, dividends);
        await context.creditToken.connect(staker1).approve(context.creditStaking.address, dividends);
        await context.creditStaking.connect(staker1).stake(dividends);
        await setTime(context.startTime);

        // WHEN
        await advanceTime(WEEK.mul(1));
        await context.creditStaking.connect(staker1).unstake(dividends);

        // THEN
        const penalty = await unstakingPenalty(context);
        const fees = dividends.mul(penalty).div(10000);
        const amountReceived = dividends.sub(fees);
        expect(await context.creditToken.balanceOf(staker1.address)).to.be.eq(amountReceived);
        expect(await context.creditToken.balanceOf(context.treasury)).to.be.eq(fees);
      });

      it("given third week when unstake then get the funds and fees go to the treasury address", async () => {
        // GIVEN
        const context = await deploy(startTime);
        await context.tknToken.approve(context.creditStaking.address, dividends);
        await context.creditStaking.addDividendsToPending(context.tknToken.address, dividends);
        await context.creditToken.connect(owner).transfer(staker1.address, dividends);
        await context.creditToken.connect(staker1).approve(context.creditStaking.address, dividends);
        await context.creditStaking.connect(staker1).stake(dividends);
        await setTime(context.startTime);

        // WHEN
        await advanceTime(WEEK.mul(2));
        await context.creditStaking.connect(staker1).unstake(dividends);

        // THEN
        const penalty = await unstakingPenalty(context);
        const fees = dividends.mul(penalty).div(10000);
        const amountReceived = dividends.sub(fees);
        expect(fees).to.be.gt(0);
        expect(await context.creditToken.balanceOf(staker1.address)).to.be.eq(amountReceived);
        expect(await context.creditToken.balanceOf(context.treasury)).to.be.eq(fees);
      });

      it("given fourth week when unstake then get the funds and no fees", async () => {
        // GIVEN
        const context = await deploy(startTime);
        await context.tknToken.approve(context.creditStaking.address, dividends);
        await context.creditStaking.addDividendsToPending(context.tknToken.address, dividends);
        await context.creditToken.connect(owner).transfer(staker1.address, dividends);
        await context.creditToken.connect(staker1).approve(context.creditStaking.address, dividends);
        await context.creditStaking.connect(staker1).stake(dividends);
        await setTime(context.startTime);

        // WHEN
        await advanceTime(WEEK.mul(4));
        await context.creditStaking.connect(staker1).unstake(dividends);

        // THEN
        const penalty = await unstakingPenalty(context);
        const fees = dividends.mul(penalty).div(10000);
        const amountReceived = dividends.sub(fees);
        expect(fees).to.be.eq(0);
        expect(await context.creditToken.balanceOf(staker1.address)).to.be.eq(amountReceived);
        expect(await context.creditToken.balanceOf(context.treasury)).to.be.eq(fees);
      });

      it("when unstake then creditStaking balance is decreased and user info is updated", async () => {
        // GIVEN
        const context = await deploy(startTime);
        await context.tknToken.approve(context.creditStaking.address, dividends);
        await context.creditStaking.addDividendsToPending(context.tknToken.address, dividends);
        await context.creditToken.connect(owner).transfer(staker1.address, dividends);
        await context.creditToken.connect(staker1).approve(context.creditStaking.address, dividends);
        await setTime(context.startTime);
        await advanceTime(HALF_MONTH);
        await context.creditStaking.connect(staker1).stake(dividends);

        // WHEN
        await context.creditStaking.connect(staker1).unstake(dividends);

        // THEN
        const stableDividendsInfo = await context.creditStaking.dividendsInfo(context.tknToken.address);
        const creditDividendsInfo = await context.creditStaking.dividendsInfo(context.creditToken.address);
        const usdcDividends = dividends.mul(stableDividendsInfo.accDividendsPerShare).div(ethers.constants.WeiPerEther);
        const creditDividends = dividends
          .mul(creditDividendsInfo.accDividendsPerShare)
          .div(ethers.constants.WeiPerEther);

        const userStableInfo = await context.creditStaking.users(context.tknToken.address, staker1.address);
        const userCreditInfo = await context.creditStaking.users(context.creditToken.address, staker1.address);

        expect(userStableInfo.pendingDividends).to.be.eq(usdcDividends);
        expect(userStableInfo.rewardDebt).to.be.eq(0);
        expect(userCreditInfo.pendingDividends).to.be.eq(creditDividends);
        expect(userCreditInfo.rewardDebt).to.be.eq(0);

        expect(await context.creditStaking.usersAllocation(staker1.address)).to.be.eq(0);
        expect(await context.creditStaking.totalAllocation()).to.be.eq(0);
      });
    });

    describe("dividends info", () => {
      it("given rewards leftover when changing epoch then rewards leftover are added to rewards to distribute", async () => {
        // GIVEN
        const context = await deploy(startTime);
        await context.creditToken.connect(owner).transfer(staker1.address, dividends);
        await context.tknToken.approve(context.creditStaking.address, dividends.mul(2));
        await context.creditStaking.addDividendsToPending(context.tknToken.address, dividends);
        await context.creditToken.connect(staker1).approve(context.creditStaking.address, dividends);
        await context.creditStaking.connect(staker1).stake(dividends);
        await setTime(context.startTime);
        await context.creditStaking.updateDividendsInfo(context.tknToken.address);
        await context.creditStaking.addDividendsToPending(context.tknToken.address, dividends);
        const stableDividendsInfoBefore = await context.creditStaking.dividendsInfo(context.tknToken.address);

        // WHEN
        await advanceTime(MONTH);
        await context.creditStaking.updateDividendsInfo(context.tknToken.address);

        // THEN
        const stableDividendsInfoEpoch2 = await context.creditStaking.dividendsInfo(context.tknToken.address);
        expect(stableDividendsInfoEpoch2.currentDistributionAmount).to.be.eq(
          stableDividendsInfoBefore.currentDistributionAmount
        );
        expect(stableDividendsInfoEpoch2.pendingAmount).to.be.eq(0);
        expect(stableDividendsInfoEpoch2.distributedAmount).to.be.eq(
          stableDividendsInfoBefore.currentDistributionAmount
        );

        expect(stableDividendsInfoEpoch2.accDividendsPerShare).to.be.gte(0);
        await advanceTime(MONTH);
        await advanceTime(HALF_MONTH);
        await context.creditStaking.updateDividendsInfo(context.tknToken.address);
        const stableDividendsInfo3 = await context.creditStaking.dividendsInfo(context.tknToken.address);
        expect(stableDividendsInfo3.accDividendsPerShare).to.be.gte(ethers.constants.WeiPerEther);
      });

      it("given no pending rewards when changing epoch then no rewards are added", async () => {
        // GIVEN
        const context = await deploy(startTime);
        await context.creditToken.connect(owner).transfer(staker1.address, dividends);
        await context.tknToken.approve(context.creditStaking.address, dividends);
        await context.creditStaking.addDividendsToPending(context.tknToken.address, dividends);
        await context.creditToken.connect(staker1).approve(context.creditStaking.address, dividends);
        await context.creditStaking.connect(staker1).stake(dividends);
        await setTime(context.startTime);
        await context.creditStaking.updateDividendsInfo(context.tknToken.address);

        // WHEN
        await advanceTime(MONTH);
        await context.creditStaking.updateDividendsInfo(context.tknToken.address);

        // THEN
        const stableDividendsInfo = await context.creditStaking.dividendsInfo(context.tknToken.address);
        expect(stableDividendsInfo.currentDistributionAmount).to.be.eq(0);
        expect(stableDividendsInfo.pendingAmount).to.be.eq(0);
      });
    });

    describe("emergency withdraw", () => {
      it("given non-owner when emergencyWithdraw then failing", async () => {
        // GIVEN
        const context = await deploy(startTime);
        await context.tknToken.approve(context.creditStaking.address, dividends);
        await context.creditStaking.addDividendsToPending(context.tknToken.address, dividends);
        await context.creditToken.connect(owner).transfer(staker1.address, dividends);
        await context.creditToken.connect(staker1).approve(context.creditStaking.address, dividends);
        await setTime(context.startTime);
        await advanceTime(HALF_MONTH);
        await context.creditStaking.connect(staker1).stake(dividends);

        // WHEN & THEN
        await expect(
          context.creditStaking.connect(staker1).emergencyWithdraw(context.tknToken.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("given non-owner when emergencyWithdraw then failing", async () => {
        // GIVEN
        const context = await deploy(startTime);
        await context.tknToken.approve(context.creditStaking.address, dividends);
        await context.creditStaking.addDividendsToPending(context.tknToken.address, dividends);
        await context.creditToken.connect(owner).transfer(staker1.address, dividends);
        await context.creditToken.connect(staker1).approve(context.creditStaking.address, dividends);
        await setTime(context.startTime);
        await advanceTime(HALF_MONTH);
        await context.creditStaking.connect(staker1).stake(dividends);

        // WHEN
        await context.creditStaking.connect(owner).emergencyWithdraw(context.tknToken.address);

        // THEN
        expect(await context.creditToken.balanceOf(owner.address)).to.be.gte(dividends);
        expect(await context.creditToken.balanceOf(context.creditToken.address)).to.be.eq(0);
      });
    });
  });
});

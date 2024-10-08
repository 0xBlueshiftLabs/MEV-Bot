import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";
import {
  accCreditPerShare,
  computePoolHash,
  createCP,
  deploy,
  getCreditReward,
} from "../../utils/fixtures/token/LPFarming";
import { advanceTime, now } from "../../utils/helper";

const { solidity } = waffle;
chai.use(solidity);
const { expect } = chai;

const DAY = BigNumber.from(86400);
const WEEK = BigNumber.from(604800);

describe("unit tests", () => {
  let maturity;
  let owner: SignerWithAddress;
  let staker1: SignerWithAddress;
  let staker2: SignerWithAddress;
  let poolHash: string;
  let dummyPair;
  let snapshot;

  before(async () => {
    [owner, staker1, staker2] = await ethers.getSigners();
    // sending out some eth as stakers have the max amount of eth in their balance
    await staker1.sendTransaction({
      value: ethers.utils.parseEther("10000000"),
      to: ethers.constants.AddressZero,
    });

    dummyPair = await ethers.Wallet.createRandom().getAddress();

    maturity = (await now()).add(WEEK);

    poolHash = await computePoolHash(dummyPair, maturity);
  });

  beforeEach(async () => {
    // take a snapshot of the evm
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    // reset the evm
    await ethers.provider.send("evm_revert", [snapshot]);
  });

  describe("LPFarming", () => {
    describe("initialization", () => {
      it("when contract deployment then all variables are initialized", async () => {
        // WHEN
        const context = await deploy(owner.address);

        const creditPositionAddress = await context.lpFarming.creditPosition();
        const creditTokenAddress = await context.lpFarming.creditToken();

        // THEN
        expect(creditPositionAddress).to.equal(context.creditPosition.address);
        expect(creditTokenAddress).to.equal(context.creditToken.address);
      });
    });

    describe("add/remove pool", () => {
      it("when add pool then the pool is added", async () => {
        // GIVEN
        const context = await deploy(owner.address);

        // WHEN
        await context.lpFarming.addPool(100, dummyPair, maturity);

        // THEN
        const poolInfo = await context.lpFarming.poolInfo(poolHash);

        expect(await context.lpFarming.isActivePool(poolHash)).to.be.true;
        expect(poolInfo.accCreditPerShare).to.equal(0);
        expect(poolInfo.allocPoint).to.equal(100);
        expect(poolInfo.maturity).to.equal(maturity);
        expect(poolInfo.lpSupply).to.equal(0);

        expect(context.lpFarming.addPool(100, dummyPair, maturity)).to.be.revertedWith("E1205");
      });

      it("when add multiple pools then state changing", async () => {
        // GIVEN
        const context = await deploy(owner.address);

        const pair2 = await ethers.Wallet.createRandom().getAddress();

        // WHEN
        await context.lpFarming.addPool(100, dummyPair, maturity);
        await context.lpFarming.addPool(100, pair2, maturity);
        await context.lpFarming.addPool(100, pair2, maturity.add(DAY));

        // THEN
        const poolHash2 = await computePoolHash(pair2, maturity);
        const poolHash3 = await computePoolHash(pair2, maturity.add(DAY));

        const pool1Info = await context.lpFarming.poolInfo(poolHash);
        const pool2Info = await context.lpFarming.poolInfo(poolHash2);
        const pool3Info = await context.lpFarming.poolInfo(poolHash3);

        expect(await context.lpFarming.poolLength()).to.eq(3);
        expect(await context.lpFarming.totalAllocPoint()).to.eq(300);

        expect(pool1Info.maturity).to.equal(maturity);
        expect(pool2Info.maturity).to.equal(maturity);
        expect(pool3Info.maturity).to.equal(maturity.add(DAY));
      });

      it("when markPoolInactive then the pool is remove from active", async () => {
        // GIVEN
        const context = await deploy(owner.address);
        await context.lpFarming.addPool(100, dummyPair, maturity);

        // WHEN
        await advanceTime(WEEK.add(3600));
        await context.lpFarming.markPoolInactive(poolHash);

        // THEN
        expect(await context.lpFarming.isActivePool(poolHash)).to.be.false;
        expect(await context.lpFarming.totalAllocPoint()).to.eq(0);
      });
    });

    describe("deposit", () => {
      it("when deposit then the amount is added to the user's balance and the cp id transfered", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        await context.lpFarming.addPool(100, dummyPair, maturity);

        // mint cp 0 to staker1
        await createCP(context, dummyPair, staker1, staker1, maturity, BigNumber.from(ethers.utils.parseEther("1")));

        // WHEN
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 0);
        await context.lpFarming.connect(staker1).deposit(poolHash, 0);

        // THEN
        const positionInfo = await context.lpFarming.positionInfo(poolHash, staker1.address, 0);
        expect(positionInfo.amount).to.equal(ethers.constants.WeiPerEther);
        expect(positionInfo.rewardDebt).to.equal(0);

        const poolInfo = await context.lpFarming.poolInfo(poolHash);
        expect(poolInfo.lpSupply).to.equal(BigNumber.from(ethers.utils.parseEther("1")));
        expect(poolInfo.allocPoint).to.equal(100);
      });

      it("given already existing pool and new user when deposit then adding up", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        await context.lpFarming.addPool(100, dummyPair, maturity);

        // mint cp 0 to staker1
        await createCP(context, dummyPair, staker1, staker1, maturity, ethers.utils.parseEther("1"));
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 0);
        await context.lpFarming.connect(staker1).deposit(poolHash, 0);

        // min cp 1 to staker1
        await createCP(context, dummyPair, staker1, staker2, maturity, ethers.utils.parseEther("0.41"));
        await context.creditPosition.connect(staker2).approve(context.lpFarming.address, 1);

        // WHEN
        await context.lpFarming.connect(staker2).deposit(poolHash, 1);

        // THEN
        const positionInfo1 = await context.lpFarming.positionInfo(poolHash, staker2.address, 1);
        expect(positionInfo1.amount).to.equal(ethers.utils.parseEther("0.41"));
        expect(positionInfo1.rewardDebt).to.equal(0);

        const poolInfo = await context.lpFarming.poolInfo(poolHash);
        expect(poolInfo.lpSupply).to.equal(
          BigNumber.from(ethers.utils.parseEther("1").add(ethers.utils.parseEther("0.41")))
        );
        expect(poolInfo.allocPoint).to.equal(100);
      });

      it("when deposit to inactive pool then revert", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        await context.lpFarming.addPool(100, dummyPair, maturity);

        // mint cp 0 to staker1
        await createCP(context, dummyPair, staker1, staker1, maturity, ethers.utils.parseEther("1"));
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 0);
        await context.lpFarming.connect(staker1).deposit(poolHash, 0);

        // mark pool inactive
        await context.distributionMock.mock.emissionRate.returns(0);
        await context.distributionMock.mock.claimFarmingCredit.returns(0);
        await advanceTime(WEEK.add(3600));
        await context.lpFarming.markPoolInactive(poolHash);

        // WHEN + THEN
        await expect(context.lpFarming.connect(staker1).deposit(poolHash, 0)).to.be.revertedWith("E1206");
      });
    });

    describe("harvest", () => {
      it("given maturity not reached when harvest then the user's balance is updated", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        await context.lpFarming.addPool(100, dummyPair, maturity);

        // mint cp 0 to staker1
        await createCP(context, dummyPair, staker1, staker1, maturity, ethers.utils.parseEther("1"));
        // deposit
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 0);
        await context.lpFarming.connect(staker1).deposit(poolHash, 0);

        const creditBalanceBefore = await context.creditToken.balanceOf(staker1.address);
        await context.distributionMock.mock.emissionRate.returns(ethers.utils.parseEther("0.15"));
        const creditRewardToClaim = await getCreditReward(context, poolHash);

        await context.distributionMock.mock.claimFarmingCredit.returns(creditRewardToClaim);
        await context.creditToken.transfer(context.lpFarming.address, creditRewardToClaim);
        const poolInfoBefore = await context.lpFarming.poolInfo(poolHash);

        // WHEN
        await advanceTime(DAY.mul(2));
        await context.lpFarming.connect(staker1).harvest(poolHash, 0);

        // THEN
        const creditBalanceAfter = await context.creditToken.balanceOf(staker1.address);
        expect(creditBalanceAfter).to.gt(creditBalanceBefore);

        const poolInfoAfter = await context.lpFarming.poolInfo(poolHash);
        expect(poolInfoAfter.accCreditPerShare).to.equal(
          await accCreditPerShare(context, poolInfoBefore, creditRewardToClaim)
        );
      });

      it("given maturity and update before it reached when harvest then reward sent", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        await context.lpFarming.addPool(100, dummyPair, maturity);

        // mint cp 0 to staker1
        await createCP(context, dummyPair, staker1, staker1, maturity, ethers.utils.parseEther("1"));
        // deposit
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 0);
        await context.lpFarming.connect(staker1).deposit(poolHash, 0);

        const creditBalanceBefore = await context.creditToken.balanceOf(staker1.address);
        await context.distributionMock.mock.emissionRate.returns(ethers.utils.parseEther("0.15"));
        const creditRewardToClaim = await getCreditReward(context, poolHash);

        await context.distributionMock.mock.claimFarmingCredit.returns(creditRewardToClaim);
        await context.creditToken.transfer(context.lpFarming.address, creditRewardToClaim);
        const poolInfoBefore = await context.lpFarming.poolInfo(poolHash);

        // WHEN
        await advanceTime(WEEK.add(3600));
        await context.lpFarming.connect(staker1).harvest(poolHash, 0);

        // THEN
        const creditBalanceAfter = await context.creditToken.balanceOf(staker1.address);
        expect(creditBalanceAfter).to.gt(creditBalanceBefore);

        const poolInfoAfter = await context.lpFarming.poolInfo(poolHash);
        expect(poolInfoAfter.accCreditPerShare).to.equal(
          await accCreditPerShare(context, poolInfoBefore, creditRewardToClaim)
        );
      });

      it("given maturity and update after it when harvest then no reward sent", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        await context.lpFarming.addPool(100, dummyPair, maturity);

        // mint cp 0 to staker1
        await createCP(context, dummyPair, staker1, staker1, maturity, ethers.utils.parseEther("1"));
        // deposit
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 0);
        await context.lpFarming.connect(staker1).deposit(poolHash, 0);

        await context.distributionMock.mock.emissionRate.returns(ethers.utils.parseEther("0.15"));
        const creditRewardToClaim = await getCreditReward(context, poolHash);

        await context.distributionMock.mock.claimFarmingCredit.returns(creditRewardToClaim);
        await context.creditToken.transfer(context.lpFarming.address, creditRewardToClaim);

        // WHEN
        await advanceTime(WEEK.add(3600));
        await context.lpFarming.connect(staker1).harvest(poolHash, 0);

        await advanceTime(DAY.mul(2));
        const creditBalanceBefore = await context.creditToken.balanceOf(staker1.address);
        const poolInfoBefore = await context.lpFarming.poolInfo(poolHash);

        await context.distributionMock.mock.claimFarmingCredit.returns(await getCreditReward(context, poolHash));
        await context.lpFarming.connect(staker1).harvest(poolHash, 0);

        // THEN
        const creditBalanceAfter = await context.creditToken.balanceOf(staker1.address);
        expect(creditBalanceAfter).to.eq(creditBalanceBefore);

        const poolInfoAfter = await context.lpFarming.poolInfo(poolHash);
        expect(poolInfoAfter.accCreditPerShare).to.equal(poolInfoBefore.accCreditPerShare);
      });

      it("given withdraw and negative debt it when harvest then reward sent", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        await context.lpFarming.addPool(100, dummyPair, maturity);

        // mint cp 0 to staker1
        await createCP(context, dummyPair, staker1, staker1, maturity, ethers.utils.parseEther("1"));
        // deposit
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 0);
        await context.lpFarming.connect(staker1).deposit(poolHash, 0);

        const creditBalanceBefore = await context.creditToken.balanceOf(staker1.address);
        await context.distributionMock.mock.emissionRate.returns(ethers.utils.parseEther("0.15"));
        const creditRewardToClaim = await getCreditReward(context, poolHash);

        await context.distributionMock.mock.claimFarmingCredit.returns(creditRewardToClaim);
        await context.creditToken.transfer(context.lpFarming.address, creditRewardToClaim);
        const positionInfoBefore = await context.lpFarming.positionInfo(poolHash, staker1.address, 0);
        await advanceTime(WEEK.add(3600));
        await context.lpFarming.connect(staker1).withdraw(poolHash, 0);

        // WHEN
        await advanceTime(DAY);
        await context.lpFarming.connect(staker1).harvest(poolHash, 0);

        // THEN
        const creditBalanceAfter = await context.creditToken.balanceOf(staker1.address);
        const poolInfoAfter = await context.lpFarming.poolInfo(poolHash);
        const rewardDebt = positionInfoBefore.rewardDebt.sub(
          ethers.utils.parseEther("1").mul(poolInfoAfter.accCreditPerShare).div(BigNumber.from(1e12))
        );

        expect(creditBalanceAfter).to.gt(creditBalanceBefore);
        expect(await context.creditToken.balanceOf(staker1.address)).to.be.eq(rewardDebt.mul(-1));
      });
    });

    describe("withdraw", () => {
      it("when withdraw then cp id transfered and harvest", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        await context.lpFarming.addPool(100, dummyPair, maturity);

        // mint cp 0 to staker1
        await createCP(context, dummyPair, staker1, staker1, maturity, ethers.utils.parseEther("1"));
        // deposit
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 0);
        await context.lpFarming.connect(staker1).deposit(poolHash, 0);

        const creditBalanceBefore = await context.creditToken.balanceOf(staker1.address);
        await context.distributionMock.mock.emissionRate.returns(ethers.utils.parseEther("0.15"));
        const creditRewardToClaim = await getCreditReward(context, poolHash);

        await context.distributionMock.mock.claimFarmingCredit.returns(creditRewardToClaim);
        await context.creditToken.transfer(context.lpFarming.address, creditRewardToClaim);
        const poolInfoBefore = await context.lpFarming.poolInfo(poolHash);
        const positionInfoBefore = await context.lpFarming.positionInfo(poolHash, staker1.address, 0);

        await advanceTime(WEEK.add(3600));

        // WHEN
        await context.lpFarming.connect(staker1).withdraw(poolHash, 0);

        // THEN
        const poolInfoAfter = await context.lpFarming.poolInfo(poolHash);
        const positionInfoAfter = await context.lpFarming.positionInfo(poolHash, staker1.address, 0);
        const creditBalanceAfter = await context.creditToken.balanceOf(staker1.address);

        expect(poolInfoBefore.lpSupply.sub(poolInfoAfter.lpSupply)).to.equal(ethers.utils.parseEther("1"));
        expect(positionInfoAfter.amount).to.equal(0);
        expect(positionInfoAfter.rewardDebt).to.equal(
          positionInfoBefore.rewardDebt.sub(
            ethers.utils.parseEther("1").mul(poolInfoAfter.accCreditPerShare).div(BigNumber.from(1e12))
          )
        );

        expect(creditBalanceAfter).to.eq(creditBalanceBefore);

        expect(await context.creditPosition.ownerOf(0)).to.eq(staker1.address);
      });

      it("given inactive pool when withdraw then cp id transfered and harvest", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        await context.lpFarming.addPool(100, dummyPair, maturity);

        // mint cp 0 to staker1
        await createCP(context, dummyPair, staker1, staker1, maturity, ethers.utils.parseEther("1"));
        // deposit
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 0);
        await context.lpFarming.connect(staker1).deposit(poolHash, 0);

        const creditBalanceBefore = await context.creditToken.balanceOf(staker1.address);
        await context.distributionMock.mock.emissionRate.returns(ethers.utils.parseEther("0.15"));
        const creditRewardToClaim = await getCreditReward(context, poolHash);

        await context.distributionMock.mock.claimFarmingCredit.returns(creditRewardToClaim);
        await context.creditToken.transfer(context.lpFarming.address, creditRewardToClaim);
        const poolInfoBefore = await context.lpFarming.poolInfo(poolHash);
        const positionInfoBefore = await context.lpFarming.positionInfo(poolHash, staker1.address, 0);

        await advanceTime(WEEK.add(3600));
        await context.lpFarming.markPoolInactive(poolHash);

        // WHEN
        await context.lpFarming.connect(staker1).withdraw(poolHash, 0);

        // THEN
        const poolInfoAfter = await context.lpFarming.poolInfo(poolHash);
        const positionInfoAfter = await context.lpFarming.positionInfo(poolHash, staker1.address, 0);
        const creditBalanceAfter = await context.creditToken.balanceOf(staker1.address);

        expect(poolInfoBefore.lpSupply.sub(poolInfoAfter.lpSupply)).to.equal(ethers.utils.parseEther("1"));
        expect(positionInfoAfter.amount).to.equal(0);
        expect(positionInfoAfter.rewardDebt).to.equal(
          positionInfoBefore.rewardDebt.sub(
            ethers.utils.parseEther("1").mul(poolInfoAfter.accCreditPerShare).div(BigNumber.from(1e12))
          )
        );

        expect(creditBalanceAfter).to.eq(creditBalanceBefore);

        expect(await context.creditPosition.ownerOf(0)).to.eq(staker1.address);
      });

      it("given multiple cp id when withdraw one then cp id transfered and harvest", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        await context.lpFarming.addPool(100, dummyPair, maturity);

        // mint cp 0, 1, 2 to staker1
        await createCP(context, dummyPair, staker1, staker1, maturity, ethers.utils.parseEther("1"));
        await createCP(context, dummyPair, staker1, staker1, maturity, ethers.utils.parseEther("0.1"));
        await createCP(context, dummyPair, staker1, staker1, maturity, ethers.utils.parseEther("0.01"));
        // deposit
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 0);
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 1);
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 2);
        await context.lpFarming.connect(staker1).deposit(poolHash, 0);
        await context.lpFarming.connect(staker1).deposit(poolHash, 1);
        await context.lpFarming.connect(staker1).deposit(poolHash, 2);

        const creditBalanceBefore = await context.creditToken.balanceOf(staker1.address);
        await context.distributionMock.mock.emissionRate.returns(ethers.utils.parseEther("0.15"));
        const creditRewardToClaim = await getCreditReward(context, poolHash);

        await context.distributionMock.mock.claimFarmingCredit.returns(creditRewardToClaim);
        await context.creditToken.transfer(context.lpFarming.address, creditRewardToClaim);
        const poolInfoBefore = await context.lpFarming.poolInfo(poolHash);
        const positionInfoBefore = await context.lpFarming.positionInfo(poolHash, staker1.address, 1);

        await advanceTime(DAY);

        // WHEN
        await context.lpFarming.connect(staker1).withdraw(poolHash, 1);

        // THEN
        const poolInfoAfter = await context.lpFarming.poolInfo(poolHash);
        const positionInfoAfter = await context.lpFarming.positionInfo(poolHash, staker1.address, 1);
        const creditBalanceAfter = await context.creditToken.balanceOf(staker1.address);

        expect(creditBalanceAfter).to.eq(creditBalanceBefore);

        expect(poolInfoBefore.lpSupply.sub(poolInfoAfter.lpSupply)).to.equal(ethers.utils.parseEther("0.1"));
        expect(positionInfoAfter.amount).to.equal(0);
        expect(positionInfoAfter.rewardDebt).to.equal(
          positionInfoBefore.rewardDebt.sub(
            ethers.utils.parseEther("0.1").mul(poolInfoAfter.accCreditPerShare).div(BigNumber.from(1e12))
          )
        );
        expect(await context.creditPosition.ownerOf(1)).to.eq(staker1.address);
        expect(await context.creditPosition.ownerOf(0)).to.eq(context.lpFarming.address);
        expect(await context.creditPosition.ownerOf(2)).to.eq(context.lpFarming.address);
      });

      it("given multiple cp id when withdrawAll then all transfered and harvest", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        await context.lpFarming.addPool(100, dummyPair, maturity);

        const amounts = [ethers.utils.parseEther("1"), ethers.utils.parseEther("0.1"), ethers.utils.parseEther("0.01")];

        for (let i = 0; i < 3; i++) {
          // mint cp 0, 1, 2 to staker1
          await createCP(context, dummyPair, staker1, staker1, maturity, amounts[i]);

          // deposit
          await context.creditPosition.connect(staker1).approve(context.lpFarming.address, i);
          await context.lpFarming.connect(staker1).deposit(poolHash, i);
        }

        const creditBalanceBefore = await context.creditToken.balanceOf(staker1.address);
        await context.distributionMock.mock.emissionRate.returns(ethers.utils.parseEther("0.15"));
        const creditRewardToClaim = await getCreditReward(context, poolHash);

        await context.distributionMock.mock.claimFarmingCredit.returns(creditRewardToClaim);
        await context.creditToken.transfer(context.lpFarming.address, creditRewardToClaim);
        const poolInfoBefore = await context.lpFarming.poolInfo(poolHash);
        const positionInfoBefore = [
          await context.lpFarming.positionInfo(poolHash, staker1.address, 0),
          await context.lpFarming.positionInfo(poolHash, staker1.address, 1),
          await context.lpFarming.positionInfo(poolHash, staker1.address, 2),
        ];

        await advanceTime(DAY);

        // WHEN
        await context.lpFarming.connect(staker1).withdrawAll(poolHash, [0, 1, 2]);

        // THEN
        const poolInfoAfter = await context.lpFarming.poolInfo(poolHash);
        const positionInfoAfter = [
          await context.lpFarming.positionInfo(poolHash, staker1.address, 0),
          await context.lpFarming.positionInfo(poolHash, staker1.address, 1),
          await context.lpFarming.positionInfo(poolHash, staker1.address, 2),
        ];
        const creditBalanceAfter = await context.creditToken.balanceOf(staker1.address);

        expect(creditBalanceAfter).to.eq(creditBalanceBefore);

        for (let i = 0; i < 3; i++) {
          expect(await context.creditPosition.ownerOf(i)).to.eq(staker1.address);

          expect(positionInfoAfter[i].amount).to.equal(0);
          expect(positionInfoAfter[i].rewardDebt).to.equal(
            positionInfoBefore[i].rewardDebt.sub(
              amounts[i].mul(poolInfoAfter.accCreditPerShare).div(BigNumber.from(1e12))
            )
          );
        }

        expect(poolInfoBefore.lpSupply.sub(poolInfoAfter.lpSupply)).to.equal(ethers.utils.parseEther("1.11"));
        expect(poolInfoAfter.lpSupply).to.equal(0);
      });
    });

    describe("updatePool", () => {
      it("when updatePool then credit fetched from distributor", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        await context.lpFarming.addPool(100, dummyPair, maturity);

        // mint cp 0 to staker1
        await createCP(context, dummyPair, staker1, staker1, maturity, ethers.utils.parseEther("1"));
        // deposit
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 0);
        await context.lpFarming.connect(staker1).deposit(poolHash, 0);

        const creditBalanceBefore = await context.creditToken.balanceOf(staker1.address);
        await context.distributionMock.mock.emissionRate.returns(ethers.utils.parseEther("0.2"));
        const creditRewardToClaim = await getCreditReward(context, poolHash);

        await context.distributionMock.mock.claimFarmingCredit.returns(creditRewardToClaim);
        await context.creditToken.transfer(context.lpFarming.address, creditRewardToClaim);
        const poolInfoBefore = await context.lpFarming.poolInfo(poolHash);

        // WHEN
        await advanceTime(DAY.mul(2));
        await context.lpFarming.connect(staker1).updatePool(poolHash);

        // THEN
        const creditBalanceAfter = await context.creditToken.balanceOf(context.lpFarming.address);
        expect(creditBalanceAfter.sub(creditBalanceBefore)).to.eq(ethers.utils.parseEther("1.2"));

        const poolInfoAfter = await context.lpFarming.poolInfo(poolHash);
        expect(poolInfoAfter.accCreditPerShare).to.equal(
          await accCreditPerShare(context, poolInfoBefore, creditRewardToClaim)
        );
      });

      it("given no lp when updatePool then only date update", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        await context.lpFarming.addPool(100, dummyPair, maturity);
        const poolInfoBefore = await context.lpFarming.poolInfo(poolHash);

        // WHEN
        await advanceTime(DAY.mul(2));
        await context.lpFarming.connect(staker1).updatePool(poolHash);

        // THEN
        const poolInfoAfter = await context.lpFarming.poolInfo(poolHash);
        expect(poolInfoAfter.accCreditPerShare).to.eq(poolInfoBefore.accCreditPerShare);
        expect(poolInfoAfter.lpSupply).to.eq(poolInfoBefore.lpSupply);
        expect(poolInfoAfter.maturity).to.eq(poolInfoBefore.maturity);
        expect(poolInfoAfter.allocPoint).to.eq(poolInfoBefore.allocPoint);
        expect(poolInfoAfter.lastRewardTime).to.gt(poolInfoBefore.lastRewardTime);
      });

      it("given 3 pools when updatePool then get third of reward", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        const pair2 = await ethers.Wallet.createRandom().getAddress();
        await context.lpFarming.addPool(100, dummyPair, maturity);
        await context.lpFarming.addPool(100, pair2, maturity);
        await context.lpFarming.addPool(100, pair2, maturity.add(DAY));

        const poolHash2 = await computePoolHash(pair2, maturity);
        const poolHash3 = await computePoolHash(pair2, maturity.add(DAY));

        // mint cp 0, 1, 2 to staker1
        await createCP(context, dummyPair, staker1, staker1, maturity, ethers.utils.parseEther("1"));
        await createCP(context, pair2, staker1, staker1, maturity, ethers.utils.parseEther("1"));
        await createCP(context, pair2, staker1, staker1, maturity.add(DAY), ethers.utils.parseEther("1"));

        // deposit
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 0);
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 1);
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 2);
        await context.lpFarming.connect(staker1).deposit(poolHash, 0);
        await context.lpFarming.connect(staker1).deposit(poolHash2, 1);
        await context.lpFarming.connect(staker1).deposit(poolHash3, 2);

        // mock distribution calls
        await advanceTime(DAY);
        await context.distributionMock.mock.emissionRate.returns(11574000000000);
        const creditRewardToClaim = await getCreditReward(context, poolHash);
        await context.distributionMock.mock.claimFarmingCredit.returns(creditRewardToClaim);
        await context.creditToken.transfer(context.lpFarming.address, creditRewardToClaim);

        // WHEN
        await context.lpFarming.connect(staker1).updatePool(poolHash);
        await context.lpFarming.connect(staker1).updatePool(poolHash2);
        await context.lpFarming.connect(staker1).updatePool(poolHash3);

        // THEN
        const pool1InfoAfter = await context.lpFarming.poolInfo(poolHash);
        const pool2InfoAfter = await context.lpFarming.poolInfo(poolHash2);
        const pool3InfoAfter = await context.lpFarming.poolInfo(poolHash3);

        expect(pool1InfoAfter.accCreditPerShare)
          .to.equal(pool2InfoAfter.accCreditPerShare)
          .and.be.eq(pool3InfoAfter.accCreditPerShare);

        expect(ethers.constants.WeiPerEther.mul(pool1InfoAfter.accCreditPerShare).div(1e12)).to.closeTo(
          ethers.utils.parseEther("0.3333"),
          ethers.utils.parseEther("0.01")
        );
      });

      it("given maturity expired when updatePool then get reward up to maturity", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        await context.lpFarming.addPool(100, dummyPair, maturity);

        // mint cp 0 to staker1
        await createCP(context, dummyPair, staker1, staker1, maturity, ethers.utils.parseEther("1"));
        // deposit
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 0);
        await context.lpFarming.connect(staker1).deposit(poolHash, 0);

        await context.distributionMock.mock.emissionRate.returns(ethers.utils.parseEther("0.2"));
        const creditRewardToClaim = await getCreditReward(context, poolHash);

        await context.distributionMock.mock.claimFarmingCredit.returns(creditRewardToClaim);
        await context.creditToken.transfer(context.lpFarming.address, creditRewardToClaim);

        await advanceTime(WEEK.add(3600));
        await context.lpFarming.connect(staker1).updatePool(poolHash);

        const poolInfoBefore = await context.lpFarming.poolInfo(poolHash);

        // WHEN
        await context.lpFarming.connect(staker1).updatePool(poolHash);

        // THEN
        const poolInfoAfter = await context.lpFarming.poolInfo(poolHash);
        expect(poolInfoAfter.accCreditPerShare).to.eq(poolInfoBefore.accCreditPerShare);
        expect(poolInfoAfter.lpSupply).to.eq(poolInfoBefore.lpSupply);
        expect(poolInfoAfter.maturity).to.eq(poolInfoBefore.maturity);
        expect(poolInfoAfter.allocPoint).to.eq(poolInfoBefore.allocPoint);
        expect(poolInfoAfter.lastRewardTime).to.eq(poolInfoBefore.lastRewardTime).and.be.eq(maturity);
      });

      it("given maturity expired and inactive pool when updatePool then get reward up to maturity", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        await context.lpFarming.addPool(100, dummyPair, maturity);

        // mint cp 0 to staker1
        await createCP(context, dummyPair, staker1, staker1, maturity, ethers.utils.parseEther("1"));
        // deposit
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 0);
        await context.lpFarming.connect(staker1).deposit(poolHash, 0);

        await context.distributionMock.mock.emissionRate.returns(ethers.utils.parseEther("0.2"));
        const creditRewardToClaim = await getCreditReward(context, poolHash);

        await context.distributionMock.mock.claimFarmingCredit.returns(creditRewardToClaim);
        await context.creditToken.transfer(context.lpFarming.address, creditRewardToClaim);

        // WHEN
        await advanceTime(WEEK.add(3600));
        await context.lpFarming.connect(staker1).updatePool(poolHash);
        const poolInfoBefore = await context.lpFarming.poolInfo(poolHash);
        await context.lpFarming.markPoolInactive(poolHash);
        await context.lpFarming.connect(staker1).updatePool(poolHash);

        // THEN
        const poolInfoAfter = await context.lpFarming.poolInfo(poolHash);
        expect(poolInfoAfter.accCreditPerShare).to.eq(poolInfoBefore.accCreditPerShare);
        expect(poolInfoAfter.lpSupply).to.eq(poolInfoBefore.lpSupply);
        expect(poolInfoAfter.maturity).to.eq(poolInfoBefore.maturity);
        expect(poolInfoAfter.allocPoint).to.eq(poolInfoBefore.allocPoint);
        expect(poolInfoAfter.lastRewardTime).to.eq(poolInfoBefore.lastRewardTime).and.be.eq(maturity);
      });

      it("given 3 pools when massUpdatePools and updateEmissionRate then fair amount distributed", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        const pair2 = await ethers.Wallet.createRandom().getAddress();
        await context.lpFarming.addPool(100, dummyPair, maturity);
        await context.lpFarming.addPool(100, pair2, maturity);
        await context.lpFarming.addPool(100, pair2, maturity.add(DAY));

        const poolHash2 = await computePoolHash(pair2, maturity);
        const poolHash3 = await computePoolHash(pair2, maturity.add(DAY));

        // mint cp 0, 1, 2 to staker1
        await createCP(context, dummyPair, staker1, staker1, maturity, ethers.utils.parseEther("1"));
        await createCP(context, pair2, staker1, staker1, maturity, ethers.utils.parseEther("1"));
        await createCP(context, pair2, staker1, staker1, maturity.add(DAY), ethers.utils.parseEther("1"));

        // deposit
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 0);
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 1);
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 2);
        await context.lpFarming.connect(staker1).deposit(poolHash, 0);
        await context.lpFarming.connect(staker1).deposit(poolHash2, 1);
        await context.lpFarming.connect(staker1).deposit(poolHash3, 2);

        // update pool A and B
        await advanceTime(DAY);
        await context.distributionMock.mock.emissionRate.returns(11574000000000);
        const creditRewardToClaim = await getCreditReward(context, poolHash);
        await context.distributionMock.mock.claimFarmingCredit.returns(creditRewardToClaim);
        await context.creditToken.transfer(context.lpFarming.address, creditRewardToClaim);

        await context.lpFarming.connect(staker1).updatePool(poolHash);
        await advanceTime(DAY);
        const creditRewardToClaim2 = await getCreditReward(context, poolHash2);
        await context.distributionMock.mock.claimFarmingCredit.returns(creditRewardToClaim2);
        await context.creditToken.transfer(context.lpFarming.address, creditRewardToClaim2);
        await context.lpFarming.connect(staker1).updatePool(poolHash2);

        // WHEN
        await advanceTime(DAY);
        const creditRewardToClaim3 = await getCreditReward(context, poolHash);
        const creditRewardToClaim4 = await getCreditReward(context, poolHash2);
        const creditRewardToClaim5 = await getCreditReward(context, poolHash3);
        await context.distributionMock.mock.claimFarmingCredit
          .returns(creditRewardToClaim3)
          .returns(creditRewardToClaim4)
          .returns(creditRewardToClaim5);
        await context.lpFarming.connect(staker1).massUpdatePools();

        await context.distributionMock.mock.emissionRate.returns(5787000000000);
        await context.creditToken.transfer(
          context.lpFarming.address,
          creditRewardToClaim3.add(creditRewardToClaim4).add(creditRewardToClaim5)
        );

        await advanceTime(DAY);
        const creditRewardToClaim6 = await getCreditReward(context, poolHash);
        await context.distributionMock.mock.claimFarmingCredit.returns(creditRewardToClaim6);
        await context.creditToken.transfer(context.lpFarming.address, creditRewardToClaim6);
        await context.lpFarming.connect(staker1).updatePool(poolHash);

        // THEN
        const expectedAmountA = DAY.mul(11574000000000)
          .div(3)
          .add(DAY.mul(2).mul(11574000000000).div(3))
          .add(DAY.mul(5787000000000).div(3));
        const expectedAmountB = DAY.mul(2).mul(11574000000000).div(3).add(DAY.mul(11574000000000).div(3));
        const expectedAmountC = DAY.mul(3).mul(11574000000000).div(3);

        const expectedAmountTotal = expectedAmountA.add(expectedAmountB).add(expectedAmountC);

        expect(await context.creditToken.balanceOf(context.lpFarming.address)).to.be.closeTo(
          expectedAmountTotal,
          ethers.utils.parseEther("0.001")
        );
      });
    });

    describe("emergency withdraw", () => {
      it("when emergency withdraw then cp id transfered and accumulated CREDIT lost", async () => {
        // GIVEN
        const context = await deploy(staker1.address);
        await context.lpFarming.addPool(100, dummyPair, maturity);
        const poolHash = await computePoolHash(dummyPair, maturity);

        // mint cp 0 to staker1
        await createCP(context, dummyPair, staker1, staker1, maturity, ethers.utils.parseEther("1"));

        // deposit
        await context.creditPosition.connect(staker1).approve(context.lpFarming.address, 0);
        await context.lpFarming.connect(staker1).deposit(poolHash, 0);

        // update pool
        await advanceTime(DAY);
        await context.distributionMock.mock.emissionRate.returns(11574000000000);
        const creditRewardToClaim = await getCreditReward(context, poolHash);
        await context.distributionMock.mock.claimFarmingCredit.returns(creditRewardToClaim);
        await context.creditToken.transfer(context.lpFarming.address, creditRewardToClaim);
        await context.lpFarming.connect(staker1).updatePool(poolHash);

        // WHEN
        await context.lpFarming.connect(staker1).emergencyWithdraw(poolHash, [0]);

        // THEN
        const positionInfo = await context.lpFarming.positionInfo(poolHash, staker1.address, 0);

        expect(positionInfo.rewardDebt).to.equal(0);
        expect(positionInfo.amount).to.equal(0);
        expect(await context.creditPosition.balanceOf(staker1.address)).to.eq(1);
        expect(await context.creditToken.balanceOf(staker1.address)).to.eq(0);
        expect((await context.lpFarming.poolInfo(poolHash)).lpSupply).to.eq(0);
      });
    });
  });
});

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";

import { deploy, deployAlphaPool } from "../../utils/fixtures/gtm/AlphaPoolFactory";
import { setTime } from "../../utils/helper";

const { solidity } = waffle;
chai.use(solidity);
const { expect } = chai;

const DAY = BigNumber.from(86400);
const WEEK = BigNumber.from(604800);

const CREDIT_AMOUNT = ethers.utils.parseEther("100000");

describe("unit tests", () => {
  let owner: SignerWithAddress;
  let staker1: SignerWithAddress;
  let staker2: SignerWithAddress;
  let treasury: SignerWithAddress;
  let snapshot;
  let startTime;
  let loanStart;

  before(async () => {
    [owner, staker1, staker2, treasury] = await ethers.getSigners();
    // sending out some eth as stakers have the max amount of eth in their balance
    await staker1.sendTransaction({
      value: ethers.utils.parseEther("10000000"),
      to: ethers.constants.AddressZero,
    });

    startTime = BigNumber.from((await ethers.provider.getBlock("latest")).timestamp).add(DAY);
    loanStart = startTime.add(DAY.mul(7));
  });

  beforeEach(async () => {
    // take a snapshot of the evm
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    // reset the evm
    await ethers.provider.send("evm_revert", [snapshot]);
  });

  describe("AlphaPoolFactory", () => {
    describe("initialization", () => {
      it("should initialize with correct values", async () => {
        const context = await deploy(startTime, loanStart, startTime, treasury.address, owner.address);

        expect(await context.alphaPoolFactory.depositStart()).to.equal(startTime);
        expect(await context.alphaPoolFactory.loanStart()).to.equal(loanStart);
        expect(await context.alphaPoolFactory.credit()).to.equal(context.creditToken.address);
        expect(await context.alphaPoolFactory.creditStaking()).to.equal(context.creditStaking.address);
        expect(await context.alphaPoolFactory.poolOwner()).to.equal(owner.address);
      });

      it("should revert if initialized twice", async () => {
        const context = await deploy(startTime, loanStart, startTime, treasury.address, owner.address);

        await expect(
          context.alphaPoolFactory.initialize(
            startTime,
            loanStart,
            ethers.Wallet.createRandom().address,
            treasury.address,
            owner.address,
            context.wethToken.address
          )
        ).to.be.revertedWith("Initializable: contract is already initialized");
      });

      it("should revert if initialized with depositStart in the past", async () => {
        await expect(
          deploy(startTime.sub(DAY), loanStart, startTime, treasury.address, owner.address)
        ).to.be.revertedWith("AlphaPoolFactory: Invalid deposit start time");
      });

      it("should revert if initialized with loanStart in the past", async () => {
        await expect(deploy(startTime, startTime, startTime, treasury.address, owner.address)).to.be.revertedWith(
          "AlphaPoolFactory: Invalid loan start time"
        );
      });

      it("should revert if initialized with zero address", async () => {
        await expect(
          deploy(startTime, loanStart, startTime, ethers.constants.AddressZero, owner.address)
        ).to.be.revertedWith("AlphaPoolFactory: Invalid treasury address");
      });
    });

    describe("createAlphaPool", () => {
      it("should create an alpha pool", async () => {
        const context = await deploy(startTime, loanStart, startTime, treasury.address, owner.address);

        const tokenA = ethers.Wallet.createRandom().address;
        const tokenB = ethers.Wallet.createRandom().address;
        const allocationPoint = BigNumber.from(100);
        const maturity = startTime.add(WEEK.mul(4).mul(3));
        const tokensToDistribute = [context.creditToken.address];

        await expect(
          context.alphaPoolFactory.createAlphaPool(tokenA, tokenB, maturity, allocationPoint, tokensToDistribute)
        ).to.emit(context.alphaPoolFactory, "AlphaPoolCreated");

        const poolFetched = await context.alphaPoolFactory.alphaPools(0);

        const pool = await ethers.getContractAt("AlphaPool", poolFetched["alphaPool"]);

        expect(poolFetched["alphaPool"]).to.not.equal(ethers.constants.AddressZero);
        expect(poolFetched["allocPoint"]).to.equal(allocationPoint);
        expect(poolFetched["maturity"]).to.equal(maturity);
        expect(await pool.maturity()).to.equal(maturity);
        expect(await pool.loanStart()).to.equal(loanStart);
        expect(await pool.depositStart()).to.equal(startTime);
        expect(await pool.tokenA()).to.equal(tokenA);
        expect(await pool.tokenB()).to.equal(tokenB);
        expect(await pool.isSettlementOn()).to.be.false;
      });

      it("should increment totalAllocationPoint when creating multiple alpha pool", async () => {
        // deploy the contracts with mocked credit staking
        const context = await deploy(startTime, loanStart, startTime, treasury.address, owner.address, true);
        // add alpha pool USDC/ETH
        const maturity = startTime.add(WEEK.mul(4).mul(3));
        const allocationPoint = BigNumber.from(100);
        await deployAlphaPool(context, context.usdcToken.address, context.wethToken.address, maturity, allocationPoint);
        // allocPoint incremented
        expect(await context.alphaPoolFactory.totalAllocPoint()).to.equal(allocationPoint);
        // add alpha pool GMX/USDC
        await deployAlphaPool(context, context.gmxToken.address, context.usdcToken.address, maturity, allocationPoint);
        // allocPoint incremented
        expect(await context.alphaPoolFactory.totalAllocPoint()).to.equal(allocationPoint.mul(2));
        // add alpha pool USDC/ARB
        await deployAlphaPool(context, context.usdcToken.address, context.arbToken.address, maturity, allocationPoint);
        // allocPoint incremented
        expect(await context.alphaPoolFactory.totalAllocPoint()).to.equal(allocationPoint.mul(3));
      });

      it("should revert when maturity <= loanStart during pool creation", async () => {
        // deploy the contracts with mocked credit staking
        const context = await deploy(startTime, loanStart, startTime, treasury.address, owner.address, true);
        // add alpha pool USDC/ETH
        const maturity = loanStart;
        const allocationPoint = BigNumber.from(100);
        await expect(
          deployAlphaPool(context, context.usdcToken.address, context.wethToken.address, maturity, allocationPoint)
        ).to.revertedWith("AlphaPoolFactory: Invalid maturity");
      });

      it("should change the allocation pool of a specific pool", async () => {
        // deploy the contracts with mocked credit staking
        const context = await deploy(startTime, loanStart, startTime, treasury.address, owner.address, true);
        // add alpha pool USDC/ETH
        const maturity = startTime.add(WEEK.mul(4).mul(3));
        const allocationPoint = BigNumber.from(100);
        await deployAlphaPool(context, context.usdcToken.address, context.wethToken.address, maturity, allocationPoint);
        // allocPoint incremented
        expect(await context.alphaPoolFactory.totalAllocPoint()).to.equal(allocationPoint);
        // change the allocation point
        const newAllocationPoint = BigNumber.from(200);
        await context.alphaPoolFactory.changeAllocationPoint(0, newAllocationPoint);
        // allocPoint changed
        expect(await context.alphaPoolFactory.totalAllocPoint()).to.equal(newAllocationPoint);
      });
    });

    describe("stake", () => {
      it("should send amount for staking", async () => {
        // deploy the contracts with mocked credit staking
        const context = await deploy(startTime, loanStart, startTime, treasury.address, owner.address, true);
        // transfer some credit to alpha pool factory (mock the distributor)
        await context.creditToken.transfer(context.alphaPoolFactory.address, CREDIT_AMOUNT);
        expect(await context.creditToken.balanceOf(context.alphaPoolFactory.address)).to.equal(CREDIT_AMOUNT);
        // stake credit
        await context.alphaPoolFactory.connect(owner).stake(CREDIT_AMOUNT);
        expect(await context.creditToken.balanceOf(context.alphaPoolFactory.address)).to.equal(0);
      });
    });

    describe("unstake", () => {
      it("should unstake the amount of CREDIT and transfer it appropriatly to the alpha pools", async () => {
        // deploy the contracts with mocked credit staking
        const context = await deploy(startTime, loanStart, startTime, treasury.address, owner.address, true);
        // add alpha pool USDC/ETH
        const maturity = startTime.add(WEEK.mul(4).mul(3));
        const allocationPoint = BigNumber.from(100);
        await deployAlphaPool(context, context.usdcToken.address, context.wethToken.address, maturity, allocationPoint);
        // add alpha pool GMX/USDC
        await deployAlphaPool(context, context.gmxToken.address, context.usdcToken.address, maturity, allocationPoint);
        // add alpha pool USDC/ARB
        await deployAlphaPool(context, context.usdcToken.address, context.arbToken.address, maturity, allocationPoint);
        expect(await context.alphaPoolFactory.totalAllocPoint()).to.equal(allocationPoint.mul(3));
        // transfer some credit to alpha pool factory (mock the distributor)
        await context.creditToken.transfer(context.alphaPoolFactory.address, CREDIT_AMOUNT);
        expect(await context.creditToken.balanceOf(context.alphaPoolFactory.address)).to.equal(CREDIT_AMOUNT);
        // stake credit
        await context.alphaPoolFactory.connect(owner).stake(CREDIT_AMOUNT);
        // advance time to loan start
        await setTime(loanStart);
        // unstake credit
        await context.alphaPoolFactory.connect(owner).unstake(CREDIT_AMOUNT);
        expect(await context.alphaPoolFactory.amountUnstaked()).to.equal(CREDIT_AMOUNT);
        // check the balances of the alpha pools
        const poolFetched0 = await context.alphaPoolFactory.alphaPools(0);
        const poolFetched1 = await context.alphaPoolFactory.alphaPools(1);
        const poolFetched2 = await context.alphaPoolFactory.alphaPools(2);
        expect(await context.creditToken.balanceOf(poolFetched0[0])).to.equal(CREDIT_AMOUNT.div(3));
        expect(await context.creditToken.balanceOf(poolFetched1[0])).to.equal(CREDIT_AMOUNT.div(3));
        expect(await context.creditToken.balanceOf(poolFetched2[0])).to.equal(CREDIT_AMOUNT.div(3));
      });

      it("should unstake if not pools are created", async () => {
        // deploy the contracts with mocked credit staking
        const context = await deploy(startTime, loanStart, startTime, treasury.address, owner.address, true);
        // transfer some credit to alpha pool factory (mock the distributor)
        await context.creditToken.transfer(context.alphaPoolFactory.address, CREDIT_AMOUNT);
        expect(await context.creditToken.balanceOf(context.alphaPoolFactory.address)).to.equal(CREDIT_AMOUNT);
        // stake credit
        await context.alphaPoolFactory.connect(owner).stake(CREDIT_AMOUNT);
        // advance time to loan start
        await setTime(loanStart);
        // unstake credit
        await context.alphaPoolFactory.connect(owner).unstake(CREDIT_AMOUNT);
        // check balance of the alpha pool factory
        expect(await context.creditToken.balanceOf(context.alphaPoolFactory.address)).to.equal(CREDIT_AMOUNT);
      });
    });

    describe("harvest", () => {
      it("should harvest all the dividends and send half to treasury and half to the alpha pools", async () => {
        // deploy the contracts with mocked credit staking
        const context = await deploy(startTime, loanStart, startTime, treasury.address, owner.address, true);
        // add alpha pool USDC/ETH
        const maturity = startTime.add(WEEK.mul(4).mul(3));
        const allocationPoint = BigNumber.from(100);
        await deployAlphaPool(context, context.usdcToken.address, context.wethToken.address, maturity, allocationPoint);
        // add alpha pool GMX/USDC
        await deployAlphaPool(context, context.gmxToken.address, context.usdcToken.address, maturity, allocationPoint);
        // add alpha pool USDC/ARB
        await deployAlphaPool(context, context.usdcToken.address, context.arbToken.address, maturity, allocationPoint);
        expect(await context.alphaPoolFactory.totalAllocPoint()).to.equal(allocationPoint.mul(3));
        // transfer some credit to alpha pool factory (mock the distributor)
        await context.creditToken.transfer(context.alphaPoolFactory.address, CREDIT_AMOUNT);
        expect(await context.creditToken.balanceOf(context.alphaPoolFactory.address)).to.equal(CREDIT_AMOUNT);
        // stake credit
        await context.alphaPoolFactory.connect(owner).stake(CREDIT_AMOUNT);
        // advance time to loan start
        await setTime(loanStart);
        // fund the staking contract with the reward tokens
        await context.creditToken.transfer(context.creditStaking.address, 100);
        await context.wethToken.transfer(context.creditStaking.address, 100);
        await context.tknToken.transfer(context.creditStaking.address, 100);
        // harvestAndDistribute
        await context.alphaPoolFactory.connect(owner).harvestAndDistribute();
        // check the balances of the alpha pools
        const reward = BigNumber.from(100);
        const poolFetched0 = await context.alphaPoolFactory.alphaPools(0);
        const poolFetched1 = await context.alphaPoolFactory.alphaPools(1);
        const poolFetched2 = await context.alphaPoolFactory.alphaPools(2);
        expect(await context.creditToken.balanceOf(poolFetched0[0])).to.equal(reward.div(6));
        expect(await context.wethToken.balanceOf(poolFetched0[0])).to.equal(reward.div(6));
        expect(await context.tknToken.balanceOf(poolFetched0[0])).to.equal(reward.div(6));

        expect(await context.creditToken.balanceOf(poolFetched1[0])).to.equal(reward.div(6));
        expect(await context.wethToken.balanceOf(poolFetched1[0])).to.equal(reward.div(6));
        expect(await context.tknToken.balanceOf(poolFetched1[0])).to.equal(reward.div(6));

        expect(await context.creditToken.balanceOf(poolFetched2[0])).to.equal(reward.div(6));
        expect(await context.wethToken.balanceOf(poolFetched2[0])).to.equal(reward.div(6));
        expect(await context.tknToken.balanceOf(poolFetched2[0])).to.equal(reward.div(6));
        // check the balances of the treasury
        expect(await context.creditToken.balanceOf(treasury.address)).to.equal(reward.div(2));
        expect(await context.wethToken.balanceOf(treasury.address)).to.equal(reward.div(2));
        expect(await context.tknToken.balanceOf(treasury.address)).to.equal(reward.div(2));
      });
    });
  });
});

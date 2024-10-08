import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, waffle } from "hardhat";
import { CreditStaking } from "../../../typechain";
import { deploy, deployAlphaPool } from "../../utils/fixtures/gtm/AlphaPoolFactory";
import { setTime } from "../../utils/helper";

const { solidity } = waffle;
chai.use(solidity);
const { expect } = chai;

const DAY = BigNumber.from(86400);
const WEEK = BigNumber.from(604800);
const MONTH = BigNumber.from(2629743);

describe("integration tests", () => {
  let owner: SignerWithAddress;
  let staker1: SignerWithAddress;
  let staker2: SignerWithAddress;
  let staker3: SignerWithAddress;
  let treasury: SignerWithAddress;
  let snapshot;
  let startTime;
  let loanStart;

  before(async () => {
    [owner, staker1, staker2, staker3, treasury] = await ethers.getSigners();
    // sending out some eth as stakers have the max amount of eth in their balance
    await staker1.sendTransaction({
      value: ethers.utils.parseEther("10000000"),
      to: ethers.constants.AddressZero,
    });
    await staker2.sendTransaction({
      value: ethers.utils.parseEther("10000000"),
      to: ethers.constants.AddressZero,
    });
    await staker3.sendTransaction({
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

  describe("AlphaPool", () => {
    it("should create pools, stake, unstake", async () => {
      const stakingStart = startTime.add(WEEK.mul(4));
      const context = await deploy(startTime, loanStart, stakingStart, treasury.address, owner.address);
      const { alphaPoolFactory, usdcToken, wethToken, gmxToken, arbToken, tknToken, creditToken, creditStaking } =
        context;

      // create pools
      const maturity = startTime.add(WEEK.mul(4).mul(3));
      const allocationPoint = BigNumber.from(100);
      await deployAlphaPool(context, usdcToken.address, wethToken.address, maturity, allocationPoint);
      await deployAlphaPool(context, gmxToken.address, usdcToken.address, maturity, allocationPoint);
      await deployAlphaPool(context, usdcToken.address, arbToken.address, maturity, allocationPoint);
      expect(await context.alphaPoolFactory.totalAllocPoint()).to.equal(allocationPoint.mul(3));
      const [pool1Address] = await context.alphaPoolFactory.alphaPools(0);
      const [pool2Address] = await context.alphaPoolFactory.alphaPools(1);
      const [pool3Address] = await context.alphaPoolFactory.alphaPools(2);
      const pool1 = await ethers.getContractAt("AlphaPool", pool1Address);
      const pool2 = await ethers.getContractAt("AlphaPool", pool2Address);
      const pool3 = await ethers.getContractAt("AlphaPool", pool3Address);

      // set time to startTime
      await setTime(startTime);

      // staker1,2,3 pledge to pool1
      const amountPledge1 = ethers.utils.parseEther("55");
      const amountPledge2 = ethers.utils.parseEther("1.3");
      const amountPledge3 = ethers.utils.parseEther("7");

      await pool1.connect(staker1).pledge({ value: amountPledge1 });
      await pool1.connect(staker2).pledge({ value: amountPledge2 });
      await pool1.connect(staker3).pledge({ value: amountPledge3 });
      // staker1,2,3 pledge to pool2
      await pool2.connect(staker1).pledge({ value: amountPledge1 });
      await pool2.connect(staker2).pledge({ value: amountPledge2 });
      await pool2.connect(staker3).pledge({ value: amountPledge3 });
      // staker1,2,3 pledge to pool3
      await pool3.connect(staker1).pledge({ value: amountPledge1 });
      await pool3.connect(staker2).pledge({ value: amountPledge2 });
      await pool3.connect(staker3).pledge({ value: amountPledge3 });

      // distributor sends tokens to factory
      const amount = ethers.utils.parseEther("100000");
      await creditToken.transfer(alphaPoolFactory.address, amount);
      expect(await creditToken.balanceOf(alphaPoolFactory.address)).to.equal(amount);

      // set up the staking contract
      const creditStakingRewards = ethers.utils.parseEther("9876");
      await creditToken.approve(creditStaking.address, creditStakingRewards);
      await creditStaking.addDividendsToPending(creditToken.address, creditStakingRewards);

      const tknStakingRewards = ethers.utils.parseEther("1234");
      await tknToken.approve(creditStaking.address, tknStakingRewards);
      await creditStaking.addDividendsToPending(tknToken.address, tknStakingRewards);

      const wethStakingRewards = ethers.utils.parseEther("5678");
      await wethToken.approve(creditStaking.address, wethStakingRewards);
      await creditStaking.addDividendsToPending(wethToken.address, wethStakingRewards);

      // stake
      await alphaPoolFactory.stake(amount);
      expect(await creditToken.balanceOf(alphaPoolFactory.address)).to.equal(0);
      expect(await (creditStaking as CreditStaking).usersAllocation(alphaPoolFactory.address)).to.equal(amount);
      // move to staking start
      await setTime(stakingStart);
      await (creditStaking as CreditStaking).massUpdateDividendsInfo();
      // move the 4th week of the staking period
      await setTime(stakingStart.add(MONTH.mul(3).div(4)));
      // unstake
      await alphaPoolFactory.unstake(amount);
      // alpha pools should have all the CREDIT back
      expect(await creditToken.balanceOf(alphaPoolFactory.address)).to.closeTo(0, 1);
      expect(await creditToken.balanceOf(pool1.address)).to.closeTo(amount.div(3), 1);
      expect(await creditToken.balanceOf(pool2.address)).to.closeTo(amount.div(3), 1);
      expect(await creditToken.balanceOf(pool3.address)).to.closeTo(amount.div(3), 1);

      // snapshot of treasury balance
      const creditTreasuryBalance = await creditToken.balanceOf(treasury.address);
      const wethTreasuryBalance = await wethToken.balanceOf(treasury.address);
      const tknTreasuryBalance = await tknToken.balanceOf(treasury.address);

      // harvest the rewards
      await alphaPoolFactory.harvestAndDistribute();
      const creditDistroInAlphaPool = amount.div(3);
      const creditHarvestInAlphaPool = creditStakingRewards.mul(3).div(4);
      const wethHarvestInAlphaPool = wethStakingRewards.mul(3).div(4);
      const tknHarvestInAlphaPool = tknStakingRewards.mul(3).div(4);

      // half goes to the treasury
      expect((await creditToken.balanceOf(treasury.address)).sub(creditTreasuryBalance)).to.closeTo(
        creditHarvestInAlphaPool.div(2),
        ethers.utils.parseEther("0.1")
      );
      expect((await wethToken.balanceOf(treasury.address)).sub(wethTreasuryBalance)).to.closeTo(
        wethHarvestInAlphaPool.div(2),
        ethers.utils.parseEther("0.1")
      );
      expect((await tknToken.balanceOf(treasury.address)).sub(tknTreasuryBalance)).to.closeTo(
        tknHarvestInAlphaPool.div(2),
        ethers.utils.parseEther("0.1")
      );
      // half goes to the alpha pool
      await checkPoolBalance(
        [pool1, pool2, pool3],
        creditToken,
        wethToken,
        tknToken,
        creditHarvestInAlphaPool,
        wethHarvestInAlphaPool,
        tknHarvestInAlphaPool,
        creditDistroInAlphaPool
      );

      // add eth to reimburse to all pools
      const reimburseAmountPool1 = ethers.utils.parseEther("100");
      const reimburseAmountPool2 = ethers.utils.parseEther("49");
      const reimburseAmountPool3 = ethers.utils.parseEther("12");
      await pool1.addEthToReimburse({ value: reimburseAmountPool1 });
      await pool2.addEthToReimburse({ value: reimburseAmountPool2 });
      await pool3.addEthToReimburse({ value: reimburseAmountPool3 });

      // set time to maturity
      await setTime(maturity);

      // initiate settlement
      await pool1.settlementOn();
      await pool2.settlementOn();
      await pool3.settlementOn();

      // snapshot balance of stakers
      const staker1CreditBalanceBefore = await creditToken.balanceOf(staker1.address);

      const staker1EthBalanceBefore = await ethers.provider.getBalance(staker1.address);
      const staker2EthBalanceBefore = await ethers.provider.getBalance(staker2.address);
      const staker3EthBalanceBefore = await ethers.provider.getBalance(staker3.address);

      // withdraw pool1 pledge
      await pool1.connect(staker1).withdraw();
      await pool1.connect(staker2).withdraw();
      await pool1.connect(staker3).withdraw();
      // check stakers balance
      const staker1EthBalanceAfter = await ethers.provider.getBalance(staker1.address);
      const staker2EthBalanceAfter = await ethers.provider.getBalance(staker2.address);
      const staker3EthBalanceAfter = await ethers.provider.getBalance(staker3.address);

      expect(staker1EthBalanceAfter.sub(staker1EthBalanceBefore)).to.closeTo(
        reimburseAmountPool1.mul(amountPledge1).div(ethers.utils.parseEther("63.3")),
        ethers.utils.parseEther("0.1")
      );
      expect(staker2EthBalanceAfter.sub(staker2EthBalanceBefore)).to.closeTo(
        reimburseAmountPool1.mul(amountPledge2).div(ethers.utils.parseEther("63.3")),
        ethers.utils.parseEther("0.1")
      );
      expect(staker3EthBalanceAfter.sub(staker3EthBalanceBefore)).to.closeTo(
        reimburseAmountPool1.mul(amountPledge3).div(ethers.utils.parseEther("63.3")),
        ethers.utils.parseEther("0.1")
      );
      // withdraw pool2 pledge
      await pool2.connect(staker1).withdraw();
      await pool2.connect(staker2).withdraw();
      await pool2.connect(staker3).withdraw();
      // check stakers balance
      const staker1EthBalanceAfter2 = await ethers.provider.getBalance(staker1.address);
      const staker2EthBalanceAfter2 = await ethers.provider.getBalance(staker2.address);
      const staker3EthBalanceAfter2 = await ethers.provider.getBalance(staker3.address);

      expect(staker1EthBalanceAfter2.sub(staker1EthBalanceAfter)).to.closeTo(
        reimburseAmountPool2.mul(amountPledge1).div(ethers.utils.parseEther("63.3")),
        ethers.utils.parseEther("0.1")
      );
      expect(staker2EthBalanceAfter2.sub(staker2EthBalanceAfter)).to.closeTo(
        reimburseAmountPool2.mul(amountPledge2).div(ethers.utils.parseEther("63.3")),
        ethers.utils.parseEther("0.1")
      );
      expect(staker3EthBalanceAfter2.sub(staker3EthBalanceAfter)).to.closeTo(
        reimburseAmountPool2.mul(amountPledge3).div(ethers.utils.parseEther("63.3")),
        ethers.utils.parseEther("0.1")
      );
      // withdraw pool3 pledge
      await pool3.connect(staker1).withdraw();
      await pool3.connect(staker2).withdraw();
      await pool3.connect(staker3).withdraw();
      // check stakers balance
      const staker1EthBalanceAfter3 = await ethers.provider.getBalance(staker1.address);
      const staker2EthBalanceAfter3 = await ethers.provider.getBalance(staker2.address);
      const staker3EthBalanceAfter3 = await ethers.provider.getBalance(staker3.address);

      expect(staker1EthBalanceAfter3.sub(staker1EthBalanceAfter2)).to.closeTo(
        reimburseAmountPool3.mul(amountPledge1).div(ethers.utils.parseEther("63.3")),
        ethers.utils.parseEther("0.1")
      );
      expect(staker2EthBalanceAfter3.sub(staker2EthBalanceAfter2)).to.closeTo(
        reimburseAmountPool3.mul(amountPledge2).div(ethers.utils.parseEther("63.3")),
        ethers.utils.parseEther("0.1")
      );
      expect(staker3EthBalanceAfter3.sub(staker3EthBalanceAfter2)).to.closeTo(
        reimburseAmountPool3.mul(amountPledge3).div(ethers.utils.parseEther("63.3")),
        ethers.utils.parseEther("0.1")
      );

      // harvest the rewards
      await pool1.connect(staker1).harvestAll();
      await pool1.connect(staker2).harvestAll();
      await pool1.connect(staker3).harvestAll();

      // check staker1 credit balance
      const staker1CreditBalanceAfter = await creditToken.balanceOf(staker1.address);
      expect(staker1CreditBalanceAfter.sub(staker1CreditBalanceBefore)).to.closeTo(
        creditHarvestInAlphaPool
          .div(2)
          .div(3)
          .add(creditDistroInAlphaPool)
          .mul(amountPledge1)
          .div(ethers.utils.parseEther("63.3")),
        ethers.utils.parseEther("0.1")
      );
    });
  });
});

async function checkPoolBalance(
  pools: Contract[],
  creditToken,
  wethToken,
  tknToken,
  creditHarvestInAlphaPool,
  wethHarvestInAlphaPool,
  tknHarvestInAlphaPool,
  creditDistroInAlphaPool
) {
  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i];
    // check balance
    expect(await creditToken.balanceOf(pool.address)).to.closeTo(
      creditHarvestInAlphaPool.div(2).div(3).add(creditDistroInAlphaPool),
      ethers.utils.parseEther("0.1")
    );
    expect(await wethToken.balanceOf(pool.address)).to.closeTo(
      wethHarvestInAlphaPool.div(2).div(3),
      ethers.utils.parseEther("0.1")
    );
    expect(await tknToken.balanceOf(pool.address)).to.closeTo(
      tknHarvestInAlphaPool.div(2).div(3),
      ethers.utils.parseEther("0.1")
    );
    // check data
    expect(await pool.tokensInterest(creditToken.address)).to.closeTo(
      creditHarvestInAlphaPool.div(2).div(3).add(creditDistroInAlphaPool),
      ethers.utils.parseEther("0.1")
    );
    expect(await pool.tokensInterest(tknToken.address)).to.closeTo(
      tknHarvestInAlphaPool.div(2).div(3),
      ethers.utils.parseEther("0.1")
    );
    expect(await pool.tokensInterest(wethToken.address)).to.closeTo(
      wethHarvestInAlphaPool.div(2).div(3),
      ethers.utils.parseEther("0.1")
    );
  }
}

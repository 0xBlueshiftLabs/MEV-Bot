import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy } from "../../utils/fixtures/gtm/AlphaPool";
import { setTime } from "../../utils/helper";

const { solidity } = waffle;
chai.use(solidity);
const { expect } = chai;

const DAY = BigNumber.from(86400);
const WEEK = BigNumber.from(604800);

describe("unit tests", () => {
  let owner: SignerWithAddress;
  let staker1: SignerWithAddress;
  let staker2: SignerWithAddress;
  let staker3: SignerWithAddress;
  let treasury: SignerWithAddress;
  let snapshot;
  let startTime;
  let loanStart;
  let maturity;

  before(async () => {
    [owner, staker1, staker2, staker3, treasury] = await ethers.getSigners();
    // sending out some eth as stakers have the max amount of eth in their balance
    await treasury.sendTransaction({
      value: ethers.utils.parseEther("10000000"),
      to: ethers.constants.AddressZero,
    });
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
    maturity = startTime.add(WEEK.mul(4));
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
    describe("initialization", () => {
      it("should deploys with the correct initialized values", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // verify init value
        expect(await context.alphaPool.depositStart()).to.eq(startTime);
        expect(await context.alphaPool.loanStart()).to.eq(loanStart);
        expect(await context.alphaPool.maturity()).to.eq(maturity);
        expect(await context.alphaPool.owner()).to.eq(owner.address);
        expect(await context.alphaPool.tokenA()).to.eq(context.tokenA.address);
        expect(await context.alphaPool.tokenB()).to.eq(context.tokenB.address);
        expect(await context.alphaPool.isSettlementOn()).to.be.false;
        expect(await context.alphaPool.tokensToDistribute(0)).to.eq(context.creditToken.address);
        expect(await context.alphaPool.tokensToDistribute(1)).to.eq(context.wethToken.address);
        expect(await context.alphaPool.tokensToDistribute(2)).to.eq(context.tknToken.address);
        expect(await context.alphaPool.tokensToDistribute(3)).to.eq(context.tokenA.address);
      });

      it("should fail if already initialize", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // revert if tryin to initialize again
        await expect(
          context.alphaPool.initialize(
            context.tokenA.address,
            context.tokenB.address,
            context.wethToken.address,
            maturity,
            startTime,
            loanStart,
            [context.creditToken.address, context.wethToken.address, context.tknToken.address],
            owner.address
          )
        ).to.be.revertedWith("Initializable: contract is already initialized");
      });
    });

    describe("deposit opened", () => {
      it("should fail when pledge is not opened", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // deposit should revert
        await expect(context.alphaPool.pledge()).to.be.revertedWith("AlphaPool: Deposit not opened");
      });

      it("should deposit when deposit is opened", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") });
        // verify pledge
        expect(await context.alphaPool.pledges(staker1.address)).to.eq(ethers.utils.parseEther("1"));
        expect(await context.alphaPool.totalPledged()).to.eq(ethers.utils.parseEther("1"));
        // verify eth balance
        expect(await ethers.provider.getBalance(context.alphaPool.address)).to.eq(ethers.utils.parseEther("1"));
      });

      it("should fail when deposit is closed", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(loanStart);
        // deposit should revert
        await expect(
          context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") })
        ).to.be.revertedWith("AlphaPool: Deposit finished");
      });

      it("should fail when user send eth without using the pledge function", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // deposit should revert
        await expect(
          staker1.sendTransaction({ to: context.alphaPool.address, value: ethers.utils.parseEther("1") })
        ).to.be.revertedWith("AlphaPool: invalid sender");
      });
    });

    describe("loan ready", () => {
      it("should return the correct ratio", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("0.001") });
        // verify ratio
        expect(await context.alphaPool.getUserRatio(staker1.address)).to.eq(ethers.constants.WeiPerEther);
        // staker2 pledge 2eth
        await context.alphaPool.connect(staker2).pledge({ value: ethers.utils.parseEther("2") });
        // verify ratio with 2 stakers
        expect(await context.alphaPool.getUserRatio(staker1.address)).to.eq(BigNumber.from("499750124937531"));
        expect(await context.alphaPool.getUserRatio(staker2.address)).to.eq(BigNumber.from("999500249875062468"));
        // staker3 pledges 10000000
        await context.alphaPool.connect(staker3).pledge({ value: ethers.utils.parseEther("10000000") });
        // verify ratio with 3 stakers
        expect(await context.alphaPool.getUserRatio(staker1.address)).to.eq(BigNumber.from("99999979"));
        expect(await context.alphaPool.getUserRatio(staker2.address)).to.eq(BigNumber.from("199999959980"));
        expect(await context.alphaPool.getUserRatio(staker3.address)).to.eq(BigNumber.from("999999799900040040"));
      });

      it("should withdraw for admin", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") });
        await context.alphaPool.connect(staker2).pledge({ value: ethers.utils.parseEther("2.125") });
        await context.alphaPool.connect(staker3).pledge({ value: ethers.utils.parseEther("0.2") });
        // verify eth balance
        expect(await ethers.provider.getBalance(context.alphaPool.address)).to.eq(ethers.utils.parseEther("3.325"));
        // set time to loan start + 1 day
        await setTime(loanStart.add(86400));
        // snap balance
        const balanceBefore = await ethers.provider.getBalance(treasury.address);
        // withdraw 1eth
        await context.alphaPool.withdrawAdmin(treasury.address, ethers.utils.parseEther("1"));
        // verify eth balance
        expect(await ethers.provider.getBalance(context.alphaPool.address)).to.eq(ethers.utils.parseEther("2.325"));
        // verify treasury balance
        const balanceAfter = await ethers.provider.getBalance(treasury.address);
        expect(balanceAfter.sub(balanceBefore)).to.eq(ethers.utils.parseEther("1"));
      });

      it("should add eth to reimburse", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") });
        await context.alphaPool.connect(staker2).pledge({ value: ethers.utils.parseEther("2.125") });
        await context.alphaPool.connect(staker3).pledge({ value: ethers.utils.parseEther("0.2") });
        // set time to loan start + 1 day
        await setTime(loanStart.add(86400));
        // verify eth balance
        expect(await ethers.provider.getBalance(context.alphaPool.address)).to.eq(ethers.utils.parseEther("3.325"));
        // withdraw all eth
        await context.alphaPool.withdrawAdmin(treasury.address, ethers.utils.parseEther("3.325"));
        // add 1.189ETH to reimburse
        await context.alphaPool.addEthToReimburse({ value: ethers.utils.parseEther("1.189") });
        // verify ethToReimburse
        expect(await context.alphaPool.totalEthToReimburse()).to.eq(ethers.utils.parseEther("1.189"));
        // add 10ETH to reimburse
        await context.alphaPool.addEthToReimburse({ value: ethers.utils.parseEther("10") });
        // verify ethToReimburse
        expect(await context.alphaPool.totalEthToReimburse()).to.eq(ethers.utils.parseEther("11.189"));
        // verify eth balance
        expect(await ethers.provider.getBalance(context.alphaPool.address)).to.eq(ethers.utils.parseEther("11.189"));
      });

      it("should add token interest", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") });
        await context.alphaPool.connect(staker2).pledge({ value: ethers.utils.parseEther("2.125") });
        await context.alphaPool.connect(staker3).pledge({ value: ethers.utils.parseEther("0.2") });
        // set time to loan start + 1 day
        await setTime(loanStart.add(86400));
        // verify eth balance
        expect(await ethers.provider.getBalance(context.alphaPool.address)).to.eq(ethers.utils.parseEther("3.325"));
        // withdraw all eth
        await context.alphaPool.withdrawAdmin(treasury.address, ethers.utils.parseEther("3.325"));
        // increase allowance for alpha pool
        await context.tknToken.approve(context.alphaPool.address, ethers.utils.parseEther("100"));
        await context.wethToken.approve(context.alphaPool.address, ethers.utils.parseEther("100"));
        await context.creditToken.approve(context.alphaPool.address, ethers.utils.parseEther("100"));
        await context.tokenA.approve(context.alphaPool.address, ethers.utils.parseEther("100"));
        // add 100 token to token interest
        await context.alphaPool.addTokenInterest(context.tknToken.address, ethers.utils.parseEther("100"));
        // verify token interest
        expect(await context.alphaPool.tokensInterest(context.tknToken.address)).to.eq(ethers.utils.parseEther("100"));
        // verify token balance
        expect(await context.tknToken.balanceOf(context.alphaPool.address)).to.eq(ethers.utils.parseEther("100"));
        // add 100 weth to token interest
        await context.alphaPool.addTokenInterest(context.wethToken.address, ethers.utils.parseEther("100"));
        // verify token interest
        expect(await context.alphaPool.tokensInterest(context.wethToken.address)).to.eq(ethers.utils.parseEther("100"));
        // verify weth balance
        expect(await context.wethToken.balanceOf(context.alphaPool.address)).to.eq(ethers.utils.parseEther("100"));
        // add 100 credit to token interest
        await context.alphaPool.addTokenInterest(context.creditToken.address, ethers.utils.parseEther("100"));
        // verify token interest
        expect(await context.alphaPool.tokensInterest(context.creditToken.address)).to.eq(
          ethers.utils.parseEther("100")
        );
        // verify credit balance
        expect(await context.creditToken.balanceOf(context.alphaPool.address)).to.eq(ethers.utils.parseEther("100"));
        // add 100 tokenA to token interest
        await context.alphaPool.addTokenInterest(context.tokenA.address, ethers.utils.parseEther("100"));
        // verify token interest
        expect(await context.alphaPool.tokensInterest(context.tokenA.address)).to.eq(ethers.utils.parseEther("100"));
        // verify tokenA balance
        expect(await context.tokenA.balanceOf(context.alphaPool.address)).to.eq(ethers.utils.parseEther("100"));
      });
    });

    describe("at settlement", () => {
      it("should withdraw the ratio of eth when withdraw", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") });
        // set time to loan start + 1 day
        await setTime(loanStart.add(86400));
        // verify eth balance
        expect(await ethers.provider.getBalance(context.alphaPool.address)).to.eq(ethers.utils.parseEther("1"));
        // withdraw all eth
        await context.alphaPool.withdrawAdmin(treasury.address, ethers.utils.parseEther("1"));
        // add 10ETH to reimburse
        await context.alphaPool.addEthToReimburse({ value: ethers.utils.parseEther("10") });
        // verify ethToReimburse
        expect(await context.alphaPool.totalEthToReimburse()).to.eq(ethers.utils.parseEther("10"));
        // set time to maturity + 1 day
        await setTime(maturity.add(86400));
        // settlement on
        await context.alphaPool.settlementOn();
        // snapshot balances
        const staker1BalanceBefore = await ethers.provider.getBalance(staker1.address);
        // withdraw staker1
        await context.alphaPool.connect(staker1).withdraw();
        // verify staker1 balance
        expect((await ethers.provider.getBalance(staker1.address)).sub(staker1BalanceBefore)).to.be.closeTo(
          ethers.utils.parseEther("10"),
          ethers.utils.parseEther("0.0001")
        );
      });

      it("should withdraw accordingly when multiple users participated", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") });
        await context.alphaPool.connect(staker2).pledge({ value: ethers.utils.parseEther("2.125") });
        await context.alphaPool.connect(staker3).pledge({ value: ethers.utils.parseEther("0.2") });
        // set time to loan start + 1 day
        await setTime(loanStart.add(86400));
        // verify eth balance
        expect(await ethers.provider.getBalance(context.alphaPool.address)).to.eq(ethers.utils.parseEther("3.325"));
        // withdraw all eth
        await context.alphaPool.withdrawAdmin(treasury.address, ethers.utils.parseEther("3.325"));
        // add 1.189ETH to reimburse
        await context.alphaPool.addEthToReimburse({ value: ethers.utils.parseEther("1.189") });
        // verify ethToReimburse
        expect(await context.alphaPool.totalEthToReimburse()).to.eq(ethers.utils.parseEther("1.189"));
        // set time to maturity + 1 day
        await setTime(maturity.add(86400));
        // settlement on
        await context.alphaPool.settlementOn();
        // snapshot balances
        const staker1BalanceBefore = await ethers.provider.getBalance(staker1.address);
        const staker2BalanceBefore = await ethers.provider.getBalance(staker2.address);
        const staker3BalanceBefore = await ethers.provider.getBalance(staker3.address);
        // withdraw staker1
        await context.alphaPool.connect(staker1).withdraw();
        // verify staker1 balance
        expect((await ethers.provider.getBalance(staker1.address)).sub(staker1BalanceBefore)).to.be.closeTo(
          ethers.utils.parseEther("1.189").mul(ethers.utils.parseEther("1")).div(ethers.utils.parseEther("3.325")),
          ethers.utils.parseEther("0.0001")
        );
        // withdraw staker2
        await context.alphaPool.connect(staker2).withdraw();
        // verify staker2 balance
        expect((await ethers.provider.getBalance(staker2.address)).sub(staker2BalanceBefore)).to.be.closeTo(
          ethers.utils.parseEther("1.189").mul(ethers.utils.parseEther("2.125")).div(ethers.utils.parseEther("3.325")),
          ethers.utils.parseEther("0.0001")
        );
        // withdraw staker3
        await context.alphaPool.connect(staker3).withdraw();
        // verify staker3 balance
        expect((await ethers.provider.getBalance(staker3.address)).sub(staker3BalanceBefore)).to.be.closeTo(
          ethers.utils.parseEther("1.189").mul(ethers.utils.parseEther("0.2")).div(ethers.utils.parseEther("3.325")),
          ethers.utils.parseEther("0.0001")
        );
      });

      it("should fail when withdrawing twice", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") });
        // set time to loan start + 1 day
        await setTime(loanStart.add(86400));
        // add 10ETH to reimburse
        await context.alphaPool.addEthToReimburse({ value: ethers.utils.parseEther("10") });
        // set time to maturity + 1 day
        await setTime(maturity.add(86400));
        // settlement on
        await context.alphaPool.settlementOn();
        // withdraw staker1
        await context.alphaPool.connect(staker1).withdraw();
        // withdraw staker1 again
        await expect(context.alphaPool.connect(staker1).withdraw()).to.be.revertedWith(
          "AlphaPool: Already collected principal"
        );
      });

      it("should fail when withdraw before loan ready", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") });
        // set time to loan start + 1 day
        await setTime(loanStart.add(86400));
        // add 10ETH to reimburse
        await context.alphaPool.addEthToReimburse({ value: ethers.utils.parseEther("10") });
        // set time to maturity - 1 day
        await setTime(maturity.sub(86400));
        // withdraw should fail
        await expect(context.alphaPool.connect(staker1).withdraw()).to.be.revertedWith(
          "AlphaPool: Pool not ready for settlement"
        );
      });

      it("should fail when withdraw when settlement not true", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") });
        // set time to loan start + 1 day
        await setTime(loanStart.add(86400));
        // add 10ETH to reimburse
        await context.alphaPool.addEthToReimburse({ value: ethers.utils.parseEther("10") });
        // set time to maturity + 1 day
        await setTime(maturity.add(86400));
        // withdraw should fail
        await expect(context.alphaPool.connect(staker1).withdraw()).to.be.revertedWith(
          "AlphaPool: Pool not ready for settlement"
        );
      });

      it("should fail if user has no principal", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") });
        // set time to loan start + 1 day
        await setTime(loanStart.add(86400));
        // add 10ETH to reimburse
        await context.alphaPool.addEthToReimburse({ value: ethers.utils.parseEther("10") });
        // set time to maturity + 1 day
        await setTime(maturity.add(86400));
        // settlement on
        await context.alphaPool.settlementOn();
        // withdraw should fail
        await expect(context.alphaPool.connect(staker2).withdraw()).to.be.revertedWith(
          "AlphaPool: User has not pledged"
        );
      });

      it("should harvest a specific token accordingly to ratio", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") });
        await context.alphaPool.connect(staker2).pledge({ value: ethers.utils.parseEther("2.125") });
        await context.alphaPool.connect(staker3).pledge({ value: ethers.utils.parseEther("0.2") });
        // set time to loan start + 1 day
        await setTime(loanStart.add(86400));
        // verify eth balance
        expect(await ethers.provider.getBalance(context.alphaPool.address)).to.eq(ethers.utils.parseEther("3.325"));
        // withdraw all eth
        await context.alphaPool.withdrawAdmin(treasury.address, ethers.utils.parseEther("3.325"));
        // approve 1000 token as interest
        await context.tknToken.approve(context.alphaPool.address, ethers.utils.parseEther("1000"));
        // add 1000  as interest
        await context.alphaPool.addTokenInterest(context.Token.address, ethers.utils.parseEther("1000"));
        // verify tokensInterest
        expect(await context.alphaPool.tokensInterest(context.tknToken.address)).to.eq(ethers.utils.parseEther("1000"));
        // set time to maturity + 1 day
        await setTime(maturity.add(86400));
        // settlement on
        await context.alphaPool.settlementOn();
        // staker 1 harvest token
        await context.alphaPool.connect(staker1).harvest(context.tknToken.address);
        // verify staker1 token balance
        expect(await context.tknToken.balanceOf(staker1.address)).to.closeTo(
          ethers.utils.parseEther("1000").mul(ethers.utils.parseEther("1")).div(ethers.utils.parseEther("3.325")),
          ethers.utils.parseEther("0.00001")
        );
      });

      it("should harvestAll a specific token accordingly to ratio", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") });
        await context.alphaPool.connect(staker2).pledge({ value: ethers.utils.parseEther("2.125") });
        await context.alphaPool.connect(staker3).pledge({ value: ethers.utils.parseEther("0.2") });
        // set time to loan start + 1 day
        await setTime(loanStart.add(86400));
        // verify eth balance
        expect(await ethers.provider.getBalance(context.alphaPool.address)).to.eq(ethers.utils.parseEther("3.325"));
        // withdraw all eth
        await context.alphaPool.withdrawAdmin(treasury.address, ethers.utils.parseEther("3.325"));
        // approve tokens as interest
        await context.tknToken.approve(context.alphaPool.address, ethers.utils.parseEther("1000"));
        await context.tokenA.approve(context.alphaPool.address, ethers.utils.parseEther("1000"));
        await context.creditToken.approve(context.alphaPool.address, ethers.utils.parseEther("1000"));
        await context.wethToken.approve(context.alphaPool.address, ethers.utils.parseEther("1000"));
        // add 1000 as interest
        await context.alphaPool.addTokenInterest(context.tknToken.address, ethers.utils.parseEther("1000"));
        await context.alphaPool.addTokenInterest(context.tokenA.address, ethers.utils.parseEther("1000"));
        await context.alphaPool.addTokenInterest(context.creditToken.address, ethers.utils.parseEther("1000"));
        await context.alphaPool.addTokenInterest(context.wethToken.address, ethers.utils.parseEther("1000"));
        // verify tokensInterest
        expect(await context.alphaPool.tokensInterest(context.tknToken.address)).to.eq(ethers.utils.parseEther("1000"));
        // set time to maturity + 1 day
        await setTime(maturity.add(86400));
        // settlement on
        await context.alphaPool.settlementOn();
        // snapshot staker1 eth balance
        const staker1EthBalance = await ethers.provider.getBalance(staker1.address);
        // staker 1 harvestAll
        await context.alphaPool.connect(staker1).harvestAll();
        // verify staker1 token balance
        expect(await context.tknToken.balanceOf(staker1.address)).to.closeTo(
          ethers.utils.parseEther("1000").mul(ethers.utils.parseEther("1")).div(ethers.utils.parseEther("3.325")),
          ethers.utils.parseEther("0.0000000000001")
        );
        // verify staker1 tokenA balance
        expect(await context.tokenA.balanceOf(staker1.address)).to.closeTo(
          ethers.utils.parseEther("1000").mul(ethers.utils.parseEther("1")).div(ethers.utils.parseEther("3.325")),
          ethers.utils.parseEther("0.0000000000001")
        );
        // verify staker1 creditToken balance
        expect(await context.creditToken.balanceOf(staker1.address)).to.closeTo(
          ethers.utils.parseEther("1000").mul(ethers.utils.parseEther("1")).div(ethers.utils.parseEther("3.325")),
          ethers.utils.parseEther("0.0000000000001")
        );
        // verify staker1 eth balance (weth is directly sent as eth)
        expect((await ethers.provider.getBalance(staker1.address)).sub(staker1EthBalance)).to.closeTo(
          ethers.utils.parseEther("1000").mul(ethers.utils.parseEther("1")).div(ethers.utils.parseEther("3.325")),
          ethers.utils.parseEther("0.001")
        );
      });

      it("should fail when harvesting second time", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") });
        await context.alphaPool.connect(staker2).pledge({ value: ethers.utils.parseEther("2.125") });
        await context.alphaPool.connect(staker3).pledge({ value: ethers.utils.parseEther("0.2") });
        // set time to loan start + 1 day
        await setTime(loanStart.add(86400));
        // verify eth balance
        expect(await ethers.provider.getBalance(context.alphaPool.address)).to.eq(ethers.utils.parseEther("3.325"));
        // withdraw all eth
        await context.alphaPool.withdrawAdmin(treasury.address, ethers.utils.parseEther("3.325"));
        // approve 1000 token as interest
        await context.tknToken.approve(context.alphaPool.address, ethers.utils.parseEther("1000"));
        // add 1000 token as interest
        await context.alphaPool.addTokenInterest(context.tknToken.address, ethers.utils.parseEther("1000"));
        // verify tokensInterest
        expect(await context.alphaPool.tokensInterest(context.tknToken.address)).to.eq(ethers.utils.parseEther("1000"));
        // set time to maturity + 1 day
        await setTime(maturity.add(86400));
        // settlement on
        await context.alphaPool.settlementOn();
        // staker 1 harvest token
        await context.alphaPool.connect(staker1).harvest(context.tknToken.address);
        // staker 1 harvest token again
        await expect(context.alphaPool.connect(staker1).harvest(context.tknToken.address)).to.be.revertedWith(
          "AlphaPool: Already collected interest"
        );
      });

      it("should fail when harvest before loan ready", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") });
        await context.alphaPool.connect(staker2).pledge({ value: ethers.utils.parseEther("2.125") });
        await context.alphaPool.connect(staker3).pledge({ value: ethers.utils.parseEther("0.2") });
        // set time to loan start + 1 day
        await setTime(loanStart.add(86400));
        // verify eth balance
        expect(await ethers.provider.getBalance(context.alphaPool.address)).to.eq(ethers.utils.parseEther("3.325"));
        // withdraw all eth
        await context.alphaPool.withdrawAdmin(treasury.address, ethers.utils.parseEther("3.325"));
        // approve 1000 token as interest
        await context.tknToken.approve(context.alphaPool.address, ethers.utils.parseEther("1000"));
        // add 1000 token as interest
        await context.alphaPool.addTokenInterest(context.tknToken.address, ethers.utils.parseEther("1000"));
        // verify tokensInterest
        expect(await context.alphaPool.tokensInterest(context.tknToken.address)).to.eq(ethers.utils.parseEther("1000"));
        // set time to maturity - 1 day
        await setTime(maturity.sub(86400));
        // staker before maturity
        await expect(context.alphaPool.connect(staker1).harvest(context.tknToken.address)).to.be.revertedWith(
          "AlphaPool: Pool not ready for settlement"
        );
      });

      it("should fail when harvest when settlement not true", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") });
        await context.alphaPool.connect(staker2).pledge({ value: ethers.utils.parseEther("2.125") });
        await context.alphaPool.connect(staker3).pledge({ value: ethers.utils.parseEther("0.2") });
        // set time to loan start + 1 day
        await setTime(loanStart.add(86400));
        // verify eth balance
        expect(await ethers.provider.getBalance(context.alphaPool.address)).to.eq(ethers.utils.parseEther("3.325"));
        // withdraw all eth
        await context.alphaPool.withdrawAdmin(treasury.address, ethers.utils.parseEther("3.325"));
        // approve 1000 token as interest
        await context.tknToken.approve(context.alphaPool.address, ethers.utils.parseEther("1000"));
        // add 1000 token as interest
        await context.alphaPool.addTokenInterest(context.tknToken.address, ethers.utils.parseEther("1000"));
        // verify tokensInterest
        expect(await context.alphaPool.tokensInterest(context.tknToken.address)).to.eq(ethers.utils.parseEther("1000"));
        // set time to maturity + 1 day
        await setTime(maturity.add(86400));
        // staker before maturity
        await expect(context.alphaPool.connect(staker1).harvest(context.tknToken.address)).to.be.revertedWith(
          "AlphaPool: Pool not ready for settlement"
        );
      });

      it("should skip token already harvested when harvestingAll", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") });
        await context.alphaPool.connect(staker2).pledge({ value: ethers.utils.parseEther("2.125") });
        await context.alphaPool.connect(staker3).pledge({ value: ethers.utils.parseEther("0.2") });
        // set time to loan start + 1 day
        await setTime(loanStart.add(86400));
        // verify eth balance
        expect(await ethers.provider.getBalance(context.alphaPool.address)).to.eq(ethers.utils.parseEther("3.325"));
        // withdraw all eth
        await context.alphaPool.withdrawAdmin(treasury.address, ethers.utils.parseEther("3.325"));
        // approve tokens as interest
        await context.tknToken.approve(context.alphaPool.address, ethers.utils.parseEther("1000"));
        await context.tokenA.approve(context.alphaPool.address, ethers.utils.parseEther("1000"));
        await context.creditToken.approve(context.alphaPool.address, ethers.utils.parseEther("1000"));
        await context.wethToken.approve(context.alphaPool.address, ethers.utils.parseEther("1000"));
        // add 1000 as interest
        await context.alphaPool.addTokenInterest(context.tknToken.address, ethers.utils.parseEther("1000"));
        await context.alphaPool.addTokenInterest(context.tokenA.address, ethers.utils.parseEther("1000"));
        await context.alphaPool.addTokenInterest(context.creditToken.address, ethers.utils.parseEther("1000"));
        await context.alphaPool.addTokenInterest(context.wethToken.address, ethers.utils.parseEther("1000"));
        // verify tokensInterest
        expect(await context.alphaPool.tokensInterest(context.tknToken.address)).to.eq(ethers.utils.parseEther("1000"));
        // set time to maturity + 1 day
        await setTime(maturity.add(86400));
        // settlement on
        await context.alphaPool.settlementOn();
        // snapshot staker1 eth balance
        const staker1EthBalance = await ethers.provider.getBalance(staker1.address);
        // staker 1 harvest token
        await context.alphaPool.connect(staker1).harvest(context.tknToken.address);
        // verify staker1 token balance
        expect(await context.tknToken.balanceOf(staker1.address)).to.closeTo(
          ethers.utils.parseEther("1000").mul(ethers.utils.parseEther("1")).div(ethers.utils.parseEther("3.325")),
          ethers.utils.parseEther("0.0000000000001")
        );
        // staker 1 harvestAll
        await context.alphaPool.connect(staker1).harvestAll();
        // verify staker1 token balance
        expect(await context.tknToken.balanceOf(staker1.address)).to.closeTo(
          ethers.utils.parseEther("1000").mul(ethers.utils.parseEther("1")).div(ethers.utils.parseEther("3.325")),
          ethers.utils.parseEther("0.0000000000001")
        );
        // verify staker1 tokenA balance
        expect(await context.tokenA.balanceOf(staker1.address)).to.closeTo(
          ethers.utils.parseEther("1000").mul(ethers.utils.parseEther("1")).div(ethers.utils.parseEther("3.325")),
          ethers.utils.parseEther("0.0000000000001")
        );
        // verify staker1 creditToken balance
        expect(await context.creditToken.balanceOf(staker1.address)).to.closeTo(
          ethers.utils.parseEther("1000").mul(ethers.utils.parseEther("1")).div(ethers.utils.parseEther("3.325")),
          ethers.utils.parseEther("0.0000000000001")
        );
        // verify staker1 eth balance (weth is directly sent as eth)
        expect((await ethers.provider.getBalance(staker1.address)).sub(staker1EthBalance)).to.closeTo(
          ethers.utils.parseEther("1000").mul(ethers.utils.parseEther("1")).div(ethers.utils.parseEther("3.325")),
          ethers.utils.parseEther("0.001")
        );
      });

      it("should send the principal eth and the interest when withdrawAndHarvestAll", async () => {
        const context = await deploy(maturity, startTime, loanStart, owner.address);
        // set time to deposit start
        await setTime(startTime);
        // pledge 1eth
        await context.alphaPool.connect(staker1).pledge({ value: ethers.utils.parseEther("1") });
        await context.alphaPool.connect(staker2).pledge({ value: ethers.utils.parseEther("2.125") });
        await context.alphaPool.connect(staker3).pledge({ value: ethers.utils.parseEther("0.2") });
        // set time to loan start + 1 day
        await setTime(loanStart.add(86400));
        // verify eth balance
        expect(await ethers.provider.getBalance(context.alphaPool.address)).to.eq(ethers.utils.parseEther("3.325"));
        // withdraw all eth
        await context.alphaPool.withdrawAdmin(treasury.address, ethers.utils.parseEther("3.325"));
        // add 10ETH to reimburse
        await context.alphaPool.addEthToReimburse({ value: ethers.utils.parseEther("10") });
        // approve tokens as interest
        await context.tknToken.approve(context.alphaPool.address, ethers.utils.parseEther("1000"));
        await context.tokenA.approve(context.alphaPool.address, ethers.utils.parseEther("1000"));
        await context.creditToken.approve(context.alphaPool.address, ethers.utils.parseEther("1000"));
        await context.wethToken.approve(context.alphaPool.address, ethers.utils.parseEther("1000"));
        // add 1000 as interest
        await context.alphaPool.addTokenInterest(context.tknToken.address, ethers.utils.parseEther("1000"));
        await context.alphaPool.addTokenInterest(context.tokenA.address, ethers.utils.parseEther("1000"));
        await context.alphaPool.addTokenInterest(context.creditToken.address, ethers.utils.parseEther("1000"));
        await context.alphaPool.addTokenInterest(context.wethToken.address, ethers.utils.parseEther("1000"));
        // verify tokensInterest
        expect(await context.alphaPool.tokensInterest(context.tknToken.address)).to.eq(ethers.utils.parseEther("1000"));
        // set time to maturity + 1 day
        await setTime(maturity.add(86400));
        // settlement on
        await context.alphaPool.settlementOn();
        // snapshot staker1 eth balance
        const staker1EthBalance = await ethers.provider.getBalance(staker1.address);
        // staker 1 harvestAll
        await context.alphaPool.connect(staker1).withdrawAndHarvestAll();
        // verify staker1 token balance
        expect(await context.tknToken.balanceOf(staker1.address)).to.closeTo(
          ethers.utils.parseEther("1000").mul(ethers.utils.parseEther("1")).div(ethers.utils.parseEther("3.325")),
          ethers.utils.parseEther("0.0000000000001")
        );
        // verify staker1 tokenA balance
        expect(await context.tokenA.balanceOf(staker1.address)).to.closeTo(
          ethers.utils.parseEther("1000").mul(ethers.utils.parseEther("1")).div(ethers.utils.parseEther("3.325")),
          ethers.utils.parseEther("0.0000000000001")
        );
        // verify staker1 creditToken balance
        expect(await context.creditToken.balanceOf(staker1.address)).to.closeTo(
          ethers.utils.parseEther("1000").mul(ethers.utils.parseEther("1")).div(ethers.utils.parseEther("3.325")),
          ethers.utils.parseEther("0.0000000000001")
        );
        // verify staker1 eth balance (weth is directly sent as eth)
        expect((await ethers.provider.getBalance(staker1.address)).sub(staker1EthBalance)).to.closeTo(
          ethers.utils.parseEther("1010").mul(ethers.utils.parseEther("1")).div(ethers.utils.parseEther("3.325")),
          ethers.utils.parseEther("0.001")
        );
      });
    });
  });
});

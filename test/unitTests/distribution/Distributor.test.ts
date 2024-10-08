import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { BigNumber, ContractReceipt } from "ethers";
import { ethers, network, waffle } from "hardhat";
import { borrowGivenPercent } from "../../utils/fixtures/Borrow";
import { DeploymentContext, createDeploymentContextFixture } from "../../utils/fixtures/Deploy";
import { newLiquidity } from "../../utils/fixtures/Liquidity";
import { deploy } from "../../utils/fixtures/gtm/AlphaPoolFactory";
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

let signers;
let tx;

let distributor, creditToken, weth, tkn, vesting, airdropClaim, auctionClaim;
let mockLPFarming, creditStaking, treasury, multiswap, teamAllocator;

let teamAllocationAmount = 100000;
let auctionAmount = 100000;
let airdropAmount = 100000;
let treasuryTotalAmount = 150000;
let treasuryVestedAmount = 50000;
let alphaPoolAmount = 100000;

let lastEmissionTime;
let vestingDuration = 1000;

let context;

async function fixture(): Promise<DeploymentContext> {
  return await createDeploymentContextFixture(signers[0], distributor.address);
}

describe("Distributor", () => {
  let maturity: BigNumber;
  before(async () => {
    signers = await ethers.getSigners();
    maturity = (await now()).add(BigNumber.from(315360000));
    await signers[1].sendTransaction({
      to: ethers.Wallet.createRandom().address,
      value: ethers.utils.parseEther("10000000000"),
    });

    const CreditToken = await ethers.getContractFactory("CreditToken");
    const TestToken = await ethers.getContractFactory("TestToken");
    const Vesting = await ethers.getContractFactory("Vesting");
    const Distributor = await ethers.getContractFactory("Distributor");
    const AirdropClaim = await ethers.getContractFactory("MockClaimer");
    const AuctionClaim = await ethers.getContractFactory("MockClaimer");
    const TeamAllocator = await ethers.getContractFactory("TeamAllocator");
    const MockCreditStaking = await ethers.getContractFactory("MockCreditStaking");
    const MockLPFarming = await ethers.getContractFactory("MockLPFarming");

    creditToken = await CreditToken.deploy();
    airdropClaim = await AirdropClaim.deploy();
    auctionClaim = await AuctionClaim.deploy();
    teamAllocator = await TeamAllocator.deploy();
    mockLPFarming = await MockLPFarming.deploy();

    vesting = await Vesting.deploy(creditToken.address);

    weth = await TestToken.deploy("WrappedETH", "WETH", 0);
    tkn = await TestToken.deploy("Token", "TKN", 0);

    [treasury, multiswap] = [signers[4], signers[5]];

    let startTime;
    let loanStart;
    startTime = BigNumber.from((await ethers.provider.getBlock("latest")).timestamp).add(24 * 60 * 60);
    loanStart = startTime.add(24 * 60 * 60 * 7);
    context = await deploy(startTime, loanStart, startTime, treasury.address, signers[0].address);

    creditStaking = await MockCreditStaking.deploy(treasury.address, creditToken.address, weth.address, tkn.address);

    await creditToken.initialize("CREDIT", "CREDIT");

    await airdropClaim.initialize(creditToken.address, creditStaking.address);
    await auctionClaim.initialize(creditToken.address, creditStaking.address);

    distributor = await Distributor.deploy();
    await creditToken.setDistributor(distributor.address);

    const initAddresses = {
      creditToken: creditToken.address,
      vesting: vesting.address,
      lpFarming: mockLPFarming.address,
      creditStaking: creditStaking.address,
      multiswap: multiswap.address,
      teamAllocator: teamAllocator.address,
      auction: auctionClaim.address,
      airdrop: airdropClaim.address,
      treasury: treasury.address,
      alphaPoolFactory: context.alphaPoolFactory.address,
    };

    await distributor.initialize(
      initAddresses,
      teamAllocationAmount,
      auctionAmount,
      airdropAmount,
      treasuryTotalAmount,
      treasuryVestedAmount,
      alphaPoolAmount,
      [ethers.utils.parseEther("0.25"), ethers.utils.parseEther("0.75")], // lower and upper ratios
      [10, 50] // lower and upper emission rates
    );

    await teamAllocator.initialize(creditToken.address, vesting.address, creditStaking.address);

    await mockLPFarming.initialize(creditToken.address, distributor.address);

    // creates two mock pools on mockLPFarming (dummy arguments)
    await mockLPFarming.addPool(
      20, // allocPoint
      mockLPFarming.address, // pair address
      100 // maturity
    );
    await mockLPFarming.addPool(
      30, // allocPoint
      treasury.address, // pair address
      200 // maturity
    );
  });

  it("distributor contract has default values", async function () {
    expect(await distributor.creditToken()).to.equal(creditToken.address);

    expect(await distributor.vesting()).to.equal(vesting.address);
    expect(await distributor.lpFarming()).to.equal(mockLPFarming.address);
    expect(await distributor.creditStaking()).to.equal(creditStaking.address);

    expect(await distributor.auction()).to.equal(auctionClaim.address);
    expect(await distributor.treasury()).to.equal(treasury.address);
    expect(await distributor.airdrop()).to.equal(airdropClaim.address);
    expect(await distributor.admin()).to.equal(ethers.constants.AddressZero);

    expect(await distributor.emissionRateInitialized()).to.equal(false);

    expect(await distributor.auctionAmount()).to.equal(auctionAmount);
    expect(await distributor.airdropAmount()).to.equal(airdropAmount);
    expect(await distributor.teamAllocationAmount()).to.equal(teamAllocationAmount);
    expect(await distributor.treasuryTotalAmount()).to.equal(treasuryTotalAmount);
    expect(await distributor.treasuryVestedAmount()).to.equal(treasuryVestedAmount);

    expect(await distributor.ratioLower()).to.equal(ethers.utils.parseEther("0.25"));
    expect(await distributor.ratioUpper()).to.equal(ethers.utils.parseEther("0.75"));
    expect(await distributor.emissionRateLower()).to.equal(10);
    expect(await distributor.emissionRateUpper()).to.equal(50);

    expect(await distributor.emissionRate()).to.equal(0);

    expect(await creditToken.balanceOf(distributor.address)).to.equal(0);

    expect(await context.alphaPoolFactory.amountUnstaked()).to.equal(0);
  });

  it("owner can set admin", async function () {
    // reverts if not owner
    await expect(distributor.connect(signers[4]).setAdmin(treasury.address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    await distributor.setAdmin(treasury.address); // random address
    expect(await distributor.admin()).to.equal(treasury.address);
  });

  it("owner can distribute", async function () {
    // granting distributor contract VESTING_CONTROLLER_ROLE on Vesting contract
    const role = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VESTING_CONTROLLER_ROLE"));
    await vesting.grantRole(role, distributor.address);

    // can't call before contract loaded with Credit token
    await expect(distributor.distribute(vestingDuration)).to.be.revertedWith("E910");

    expect(await creditToken.totalSupply()).to.equal(0);
    // loading contract with Credit token
    await distributor.mintInitialSupply(550000); // 55% of total supply
    expect(await creditToken.balanceOf(distributor.address)).to.equal(550000);
    expect(await creditToken.totalSupply()).to.equal(550000);
    expect(await creditToken.distributor()).to.equal(distributor.address);

    // only owner can call
    await expect(distributor.connect(signers[2]).distribute(vestingDuration)).to.be.revertedWith("E901");

    let contracts = [vesting, auctionClaim, airdropClaim, treasury, teamAllocator, context.alphaPoolFactory];
    let contractAmounts = [
      treasuryVestedAmount,
      auctionAmount,
      airdropAmount,
      treasuryTotalAmount - treasuryVestedAmount,
      teamAllocationAmount,
      alphaPoolAmount,
    ];

    for (let i = 0; i < contracts.length; i++) {
      expect(await creditToken.balanceOf(contracts[i].address)).to.equal(0);
    }

    tx = await distributor.distribute(vestingDuration);

    await expect(distributor.distribute(vestingDuration)).to.be.revertedWith("E910");

    expect(await vesting.lockedAmount(treasury.address)).to.equal(treasuryVestedAmount);

    expect(await creditToken.balanceOf(distributor.address)).to.equal(0);

    for (let i = 0; i < contracts.length; i++) {
      expect(await creditToken.balanceOf(contracts[i].address)).to.equal(contractAmounts[i]);
    }

    expect(await distributor.emissionRateInitialized()).to.equal(true);
    expect(await distributor.emissionRate()).to.equal(10);
  });

  it("treasury can release vested credit token", async function () {
    const block = await ethers.provider.getBlock(tx.blockHash);
    var vestingStartTime = 1 + block.timestamp;

    // fast forwards time to 10% way through vesting schedule
    await network.provider.send("evm_setNextBlockTimestamp", [vestingStartTime + vestingDuration / 10]);
    await network.provider.send("evm_mine", []);

    expect(await vesting.releasableAmount(treasury.address)).to.equal(0.1 * treasuryVestedAmount); // treasury vesting has zero cliff

    // fast forwards time to half way through vesting schedule
    await network.provider.send("evm_setNextBlockTimestamp", [vestingStartTime + vestingDuration / 2]);
    await network.provider.send("evm_setAutomine", [false]);

    await vesting.connect(treasury).release();

    await network.provider.send("evm_mine", []);
    await network.provider.send("evm_setAutomine", [true]);

    expect(await creditToken.balanceOf(treasury.address)).to.equal(
      treasuryTotalAmount - treasuryVestedAmount + 0.5 * treasuryVestedAmount
    );

    expect(await vesting.getTotalReleased()).to.equal(0.5 * treasuryVestedAmount);
  });

  it("Distributor can get fees from pair contract", async () => {
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

    // getting instance of pair contract
    const pair = await context.creditPosition.getPair(0);

    let creditMathFactory = await ethers.getContractFactory("CreditMath");
    let creditMathContractAddress = await (await creditMathFactory.deploy()).address;
    const creditPairFactory = await ethers.getContractFactory("CreditPair", {
      libraries: { CreditMath: creditMathContractAddress },
    });
    const pairContract = await creditPairFactory.attach(pair);

    expect(await pairContract.stakingFeeStored()).to.equal(0);

    // WHEN
    const receipt = await borrowGivenPercent(context, maturity, borrowGivenPercentParams, signers[1]);

    // THEN
    await assertBorrow(context, maturity, receipt, beforeState, BigNumber.from(1), signers[1]);

    expect(await pairContract.stakingFeeStored()).to.closeTo(
      ethers.utils.parseEther("14.340886673380737193"),
      ethers.utils.parseEther("0.0001")
    );

    const assetBalanceBefore = await context.assetToken.balanceOf(pairContract.address);

    await distributor.getPairFees([pairContract.address]);

    const assetBalanceAfter = await context.assetToken.balanceOf(pairContract.address);
    const delta = assetBalanceBefore.toBigInt() - assetBalanceAfter.toBigInt();

    expect(delta).to.closeTo(ethers.utils.parseEther("14.340885627461830155"), ethers.utils.parseEther("0.000001"));
    expect(await context.assetToken.balanceOf(distributor.address)).to.closeTo(
      ethers.utils.parseEther("14.340885627461830155"),
      ethers.utils.parseEther("0.000001")
    );
    expect(await pairContract.stakingFeeStored()).to.equal(0);
  });

  it("can get circulating supply", async function () {
    expect(await distributor.totalEmissions()).to.equal(0);
    expect(await airdropClaim.totalClaimed()).to.equal(0);
    expect(await auctionClaim.totalClaimed()).to.equal(0);

    var circSupply = 0;

    circSupply += (await distributor.totalEmissions()).toNumber(); // = 0
    circSupply += (await airdropClaim.totalClaimed()).toNumber(); // = 0
    circSupply += (await vesting.getTotalReleased()).toNumber();
    circSupply += treasuryTotalAmount - treasuryVestedAmount;
    circSupply += (await auctionClaim.totalClaimed()).toNumber(); // = 0
    circSupply += (await teamAllocator.totalClaimed()).toNumber(); // = 0
    circSupply += (await context.alphaPoolFactory.amountUnstaked()).toNumber();

    expect(await distributor.getCirculatingSupply()).to.equal(circSupply);
  });

  it("lpFarming contract can claim farming credit", async function () {
    // updateCreditEmissionRate --> massUpdatePools --> claimFarmingCredit --> emitAllocations

    expect(await distributor.emissionRate()).to.equal(10);
    expect(await creditToken.balanceOf(mockLPFarming.address)).to.equal(0);

    lastEmissionTime = (await distributor.lastEmissionTime()).toNumber();

    await network.provider.send("evm_setNextBlockTimestamp", [lastEmissionTime + 10000]);

    var circSupplyBefore = (await distributor.getCirculatingSupply()).toNumber();

    await distributor.updateCreditEmissionRate();

    var totalEmissions = (await distributor.totalEmissions()).toNumber();
    expect(totalEmissions).to.equal(10000 * 10); // 10000*emissionRate

    expect(await creditToken.balanceOf(mockLPFarming.address)).to.equal(20);
    expect(await distributor.farmingReserve()).to.equal((totalEmissions * 6700) / 10000 - 20); // distributionRatio/distributionBase
    // total supply should have increased
    expect(await creditToken.totalSupply()).to.equal(550000 + totalEmissions);
    // circ supply should have increased
    expect(await distributor.getCirculatingSupply()).to.equal(circSupplyBefore + totalEmissions);

    circSupplyBefore = (await distributor.getCirculatingSupply()).toNumber();

    // ratio <= lowerRatio (25%)
    expect(await distributor.emissionRate()).to.equal(10);

    // mocks staking some credit
    await airdropClaim.stake(100000);
    expect(await creditStaking.totalAllocation()).to.equal(100000);
    await auctionClaim.stake(13000);
    expect(await creditStaking.totalAllocation()).to.equal(113000);

    // ratio = 50% --> emission rate should be 30
    await network.provider.send("evm_setNextBlockTimestamp", [lastEmissionTime + 10100]);
    await distributor.updateCreditEmissionRate();

    var circSupply = await distributor.getCirculatingSupply();
    expect(circSupply.toNumber()).to.equal(circSupplyBefore + 100 * 10); // 100 * 10 emission rate

    expect(await distributor.emissionRate()).to.equal(30); // (lower+upper)/2 = (10+50)/2 = 30

    // ratio >= higherRatio (75%) --> emission rate should be 50
    await auctionClaim.stake(70000);
    expect(await creditStaking.totalAllocation()).to.equal(183000);

    await network.provider.send("evm_setNextBlockTimestamp", [lastEmissionTime + 10200]);
    await distributor.updateCreditEmissionRate();

    circSupply = await distributor.getCirculatingSupply();
    expect(circSupply.toNumber()).to.equal(circSupplyBefore + 100 * 10 + 100 * 30); // 100 * 10 emission rate + 100 * 30 emission rate

    expect(await distributor.emissionRate()).to.equal(50); // upperEmissionRate
  });

  it("alphaPoolFactory unstaking increases circulating supply by alpaPoolAmount", async function () {
    let circSupplyBefore = (await distributor.getCirculatingSupply()).toNumber();

    await context.alphaPoolFactory.setCreditStaking(creditStaking.address);
    expect(await context.alphaPoolFactory.creditStaking()).to.equal(creditStaking.address);
    await context.alphaPoolFactory.setCreditToken(creditToken.address);
    expect(await context.alphaPoolFactory.credit()).to.equal(creditToken.address);

    await context.alphaPoolFactory.stake(alphaPoolAmount);
    expect(await distributor.getCirculatingSupply()).to.equal(circSupplyBefore);

    await context.alphaPoolFactory.unstake(alphaPoolAmount / 4);
    expect(await context.alphaPoolFactory.amountUnstaked()).to.equal(alphaPoolAmount / 4);
    expect(await distributor.getCirculatingSupply()).to.equal(circSupplyBefore + alphaPoolAmount / 4);

    await context.alphaPoolFactory.unstake((3 * alphaPoolAmount) / 4);
    expect(await context.alphaPoolFactory.amountUnstaked()).to.equal(alphaPoolAmount);
    expect(await distributor.getCirculatingSupply()).to.equal(circSupplyBefore + alphaPoolAmount);
  });

  it("owner/admin can trigger staking credit claim", async function () {
    var stakingReserveBefore = (await distributor.stakingReserve()).toNumber();
    var stakingBalanceBefore = (await creditToken.balanceOf(creditStaking.address)).toNumber();

    await network.provider.send("evm_setNextBlockTimestamp", [lastEmissionTime + 10300]); // newEmission = 100 seconds * 50 emissionRate

    var expectedStakingReserve = stakingReserveBefore + (100 * 50 * 3300) / 10000; // (stakingCut)

    await distributor.claimAllStakingCredit();

    expect(await creditToken.balanceOf(creditStaking.address)).to.equal(stakingBalanceBefore + expectedStakingReserve);
    expect(await distributor.stakingReserve()).to.equal(0);
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

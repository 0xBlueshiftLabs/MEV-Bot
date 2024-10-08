import { expect } from "chai";
import { ethers, network } from "hardhat";

describe("Team Allocation", async () => {
  let owner, alice, bob, carol, treasury;
  let teamAllocator, vesting, creditToken, token, weth, creditStaking;
  let aliceAmount, bobAmount;
  let tx;
  let cliffEnd, vestingDuration;

  let month = (365.25 * 24 * 60 * 60) / 12;

  before(async () => {
    [owner, alice, bob, carol, treasury] = await ethers.getSigners();

    const TeamAllocator = await ethers.getContractFactory("TeamAllocator");
    const TestToken = await ethers.getContractFactory("TestToken");
    const MockCreditStaking = await ethers.getContractFactory("MockCreditStaking");
    const Vesting = await ethers.getContractFactory("Vesting");

    weth = await TestToken.deploy("WrappedETH", "WETH", 0);
    token = await TestToken.deploy("Token", "TKN", 0);
    creditToken = await TestToken.deploy("CREDIT", "CRED", 0);

    creditStaking = await MockCreditStaking.deploy(treasury.address, creditToken.address, weth.address, token.address);
    vesting = await Vesting.deploy(creditToken.address);

    aliceAmount = 1200; // total including vested
    bobAmount = 800; // total including vested

    teamAllocator = await TeamAllocator.deploy();

    await teamAllocator.initialize(creditToken.address, vesting.address, creditStaking.address);

    // funding AirdropClaim contract with tokens
    await creditToken.mint(teamAllocator.address, 1000);

    // granting teamAllocator contract VESTING_CONTROLLER_ROLE on Vesting contract
    const role = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VESTING_CONTROLLER_ROLE"));
    await vesting.grantRole(role, teamAllocator.address);
  });

  it("has default values", async function () {
    expect(await teamAllocator.vesting()).to.equal(vesting.address);
    expect(await teamAllocator.creditStaking()).to.equal(creditStaking.address);

    //expect(await teamAllocator.weth()).to.equal(weth.address);
    //expect(await teamAllocator.token()).to.equal(token.address);
    expect(await teamAllocator.creditToken()).to.equal(creditToken.address);

    expect(await teamAllocator.cliffEnd()).to.equal(0);
    expect(await teamAllocator.totalTeamAllocation()).to.equal(0);

    expect(await teamAllocator.unstaked()).to.equal(false);

    expect(await creditToken.balanceOf(teamAllocator.address)).to.equal(1000);

    expect(await teamAllocator.totalClaimed()).to.equal(0);
  });

  it("owner can stake tokens", async function () {
    // reverts if not owner
    await expect(teamAllocator.connect(alice).stakeTeamAllocation(3 * month, 1000)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    // reverts if _totalTeamAllocation greater than contract balance
    await expect(teamAllocator.stakeTeamAllocation(3 * month, 1001)).to.be.revertedWith(
      "ERC20: transfer amount exceeds balance"
    );

    tx = await teamAllocator.stakeTeamAllocation(3 * month, 1000);

    const block = await ethers.provider.getBlock(tx.blockHash);
    var expectedCliffEnd = 3 * month + block.timestamp;

    expect(await creditToken.balanceOf(teamAllocator.address)).to.equal(0);
    expect(await creditToken.balanceOf(creditStaking.address)).to.equal(1000);

    expect(await creditStaking.totalAllocation()).to.equal(1000);

    cliffEnd = (await teamAllocator.cliffEnd()).toNumber();
    expect(cliffEnd).to.equal(expectedCliffEnd);

    expect(await teamAllocator.cliffDuration()).to.equal(3 * month);
  });

  it("owner can unstake tokens", async function () {
    await expect(
      teamAllocator.unstakeAndVestTeamAllocation([alice.address, bob.address], [500, 600], 9 * month)
    ).to.be.revertedWith("E1002");

    await expect(
      teamAllocator.unstakeAndVestTeamAllocation([alice.address, bob.address], [100, 300, 600], 9 * month)
    ).to.be.revertedWith("E1003");

    await expect(
      teamAllocator.unstakeAndVestTeamAllocation([alice.address, bob.address], [400, 600], 9 * month)
    ).to.be.revertedWith("E1004");

    await expect(teamAllocator.connect(alice).claim()).to.be.revertedWith("E1006");

    // mocking adding some dividends to Credit Staking
    await token.mint(creditStaking.address, 100);
    await weth.mint(creditStaking.address, 100);
    await creditToken.mint(creditStaking.address, 100);
    expect(await token.balanceOf(creditStaking.address)).to.equal(100);
    expect(await weth.balanceOf(creditStaking.address)).to.equal(100);
    expect(await creditToken.balanceOf(creditStaking.address)).to.equal(1100);

    // fast forward time to cliffEnd
    await network.provider.send("evm_setNextBlockTimestamp", [cliffEnd]);
    await network.provider.send("evm_mine", []);

    await teamAllocator.unstakeAndVestTeamAllocation([alice.address, bob.address], [400, 600], 9 * month);

    expect(await teamAllocator.unstaked()).to.equal(true);

    vestingDuration = (await teamAllocator.vestingDuration()).toNumber();
    expect(vestingDuration).to.equal(9 * month);

    expect(await token.balanceOf(creditStaking.address)).to.equal(0);
    expect(await weth.balanceOf(creditStaking.address)).to.equal(0);
    expect(await creditToken.balanceOf(creditStaking.address)).to.equal(0);

    expect(await creditStaking.totalAllocation()).to.equal(0);

    expect(await token.balanceOf(teamAllocator.address)).to.equal(100);
    expect(await weth.balanceOf(teamAllocator.address)).to.equal(100);
    expect(await creditToken.balanceOf(teamAllocator.address)).to.equal(350); // as 75% of total team allocation now in vesting contract

    expect(await creditToken.balanceOf(vesting.address)).to.equal(750);

    expect(await vesting.lockedAmount(alice.address)).to.equal(300);
    expect(await vesting.lockedAmount(bob.address)).to.equal(450);

    expect(await teamAllocator.totalClaimed()).to.equal(0.25 * 1000); // cliff tokens effectively in circulation now
  });

  it("team members can claim", async function () {
    await expect(teamAllocator.connect(carol).claim()).to.be.revertedWith("E1008");

    await teamAllocator.connect(alice).claim();

    expect(await token.balanceOf(alice.address)).to.equal(40); // share of staking rewards
    expect(await weth.balanceOf(alice.address)).to.equal(40); // share of staking rewards
    expect(await creditToken.balanceOf(alice.address)).to.equal(140); // quarter of allocation + share of staking rewards

    await expect(teamAllocator.connect(alice).claim()).to.be.revertedWith("E1007");

    await teamAllocator.connect(bob).claim();

    expect(await token.balanceOf(bob.address)).to.equal(60); // share of staking rewards
    expect(await weth.balanceOf(bob.address)).to.equal(60); // share of staking rewards
    expect(await creditToken.balanceOf(bob.address)).to.equal(210); // quarter of allocation + share of staking rewards

    expect(await token.balanceOf(teamAllocator.address)).to.equal(0);
    expect(await weth.balanceOf(teamAllocator.address)).to.equal(0);
    expect(await creditToken.balanceOf(teamAllocator.address)).to.equal(0);
  });

  it("team can release vested credit tokens", async function () {
    var vestingEnd = (await teamAllocator.vestingEnd()).toNumber();

    // fast forwards time to 2/3s way through vesting schedule
    await network.provider.send("evm_setNextBlockTimestamp", [vestingEnd - vestingDuration / 3]);
    await network.provider.send("evm_setAutomine", [false]);

    await vesting.connect(alice).release();
    await vesting.connect(bob).release();

    await network.provider.send("evm_mine", []);
    await network.provider.send("evm_setAutomine", [true]);

    expect(await creditToken.balanceOf(alice.address)).to.equal(340); // 140 + 200 (balanceBefore + half of total allocation
    expect(await creditToken.balanceOf(bob.address)).to.equal(510); // 210 + 300 (balanceBefore + half of total allocation
    expect(await vesting.getTotalReleased()).to.equal(200 + 300);
  });
});

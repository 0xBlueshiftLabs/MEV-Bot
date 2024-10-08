import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { expect } from "chai";
import { ethers, network } from "hardhat";

describe("Claimer", async () => {
  let owner, alice, bob, carol, dave, admin;
  let claimer, creditToken, tkn, weth, creditStaking, treasury;
  let rootHash, newRootHash;
  let aliceAmount, bobAmount, carolAmount, daveAmount, totalAllocation;
  let aliceProof, bobProof, carolProof, daveProof;
  let distributedTokens;
  let cutOff;
  let tx;

  let totalStandardVestingDuration = 0.5 * 365.25 * 24 * 60 * 60; // 6 months
  let totalReducedVestingDuration = (365.25 * 24 * 60 * 60) / 3; // 4 months
  let standardCliff = totalStandardVestingDuration / 2; // 3 months
  let reducedCliff = totalReducedVestingDuration / 4; // 1 month

  let totalLaunchShareLocked;
  let expectedTreasuryRewards;
  let aliceExpectedRewards;

  before(async () => {
    [owner, alice, bob, carol, dave, treasury, admin] = await ethers.getSigners();

    const Claimer = await ethers.getContractFactory("Claimer");
    const TestToken = await ethers.getContractFactory("TestToken");
    const MockCreditStaking = await ethers.getContractFactory("MockCreditStaking");

    creditToken = await TestToken.deploy("CREDIT", "CRED", 0);
    weth = await TestToken.deploy("WrappedETH", "WETH", 0);
    tkn = await TestToken.deploy("Token", "TKN", 0);

    distributedTokens = [creditToken.address, weth.address, tkn.address];

    creditStaking = await MockCreditStaking.deploy(treasury.address, creditToken.address, weth.address, tkn.address);

    // total allocations
    aliceAmount = 360;
    bobAmount = 240;
    carolAmount = 900;
    daveAmount = 300;
    totalAllocation = aliceAmount + bobAmount + carolAmount + daveAmount;

    const leaves = [
      [alice.address, aliceAmount],
      [bob.address, bobAmount],
      [carol.address, carolAmount],
      [dave.address, daveAmount],
    ];

    const tree = StandardMerkleTree.of(leaves, ["address", "uint256"]);

    rootHash = tree.root;

    // new tree etc for testing setRoot()
    const newLeaves = [
      [owner.address, aliceAmount],
      [bob.address, bobAmount],
    ];
    const newTree = StandardMerkleTree.of(newLeaves, ["address", "uint256"]);
    newRootHash = newTree.root;

    claimer = await Claimer.deploy();

    await claimer.initialize(rootHash, creditToken.address, creditStaking.address, treasury.address, totalAllocation);

    // getting proofs
    for (const [i, v] of tree.entries()) {
      if (v[0] === alice.address) {
        aliceProof = tree.getProof(i);
      }
    }
    for (const [i, v] of tree.entries()) {
      if (v[0] === bob.address) {
        bobProof = tree.getProof(i);
      }
    }
    for (const [i, v] of tree.entries()) {
      if (v[0] === carol.address) {
        carolProof = tree.getProof(i);
      }
    }
    for (const [i, v] of tree.entries()) {
      if (v[0] === dave.address) {
        daveProof = tree.getProof(i);
      }
    }

    // funding Claimer contract with tokens
    tx = await creditToken.mint(claimer.address, totalAllocation);
  });

  it("has default values", async function () {
    expect(await claimer.totalClaimed()).to.equal(0);
    expect(await claimer.vestingStart()).to.equal(0);
    expect(await claimer.standardVestingEnd()).to.equal(0);
    expect(await claimer.reducedVestingEnd()).to.equal(0);
    expect(await claimer.reducedCliffDuration()).to.equal(0);
    expect(await claimer.standardCliffDuration()).to.equal(0);
    expect(await claimer.totalLaunchShareLocked()).to.equal(0);
    expect(await claimer.lockingDecisionCutOff()).to.equal(0);

    expect(await claimer.merkleRoot()).to.equal(rootHash);

    expect(await claimer.unstakedReducedCliffAmount()).to.equal(false);
    expect(await claimer.unstakedStandardCliffAmount()).to.equal(false);

    expect(await claimer.admin()).to.equal(ethers.constants.AddressZero);
    expect(await claimer.treasury()).to.equal(treasury.address);

    expect(await claimer.creditToken()).to.equal(creditToken.address);
    expect(await claimer.creditStaking()).to.equal(creditStaking.address);

    var res = await creditStaking.distributedTokens();

    for (var i = 0; i < 3; i++) {
      expect(res[i]).to.equal(distributedTokens[i]);
      expect(await claimer.lockerRewards(distributedTokens[i])).to.equal(0);
    }

    expect(await creditToken.balanceOf(claimer.address)).to.equal(totalAllocation);
  });

  it("users can lock launch share to reduce cliff", async function () {
    // lockingDecisionCutOff not set yet
    await expect(claimer.connect(alice).lockLaunchShare(aliceAmount, aliceProof)).to.be.revertedWith("E805");

    const block = await ethers.provider.getBlock(tx.blockHash);
    cutOff = block.timestamp + 100;

    await expect(claimer.connect(alice).setLockingDecisionCutOff(block.timestamp + 100)).to.be.revertedWith("E801");

    await claimer.setLockingDecisionCutOff(block.timestamp + 100);
    expect(await claimer.lockingDecisionCutOff()).to.equal(block.timestamp + 100);

    expect(await claimer.getReleasableAmount(aliceAmount, alice.address, aliceProof)).to.equal(aliceAmount / 2);

    tx = await claimer.connect(alice).lockLaunchShare(aliceAmount, aliceProof);

    await expect(tx)
      .to.emit(claimer, "Lock")
      .withArgs(alice.address, aliceAmount / 2);

    expect(await claimer.getReleasableAmount(aliceAmount, alice.address, aliceProof)).to.equal(0);
    expect(await claimer.totalLaunchShareLocked()).to.equal(aliceAmount / 2);

    await expect(claimer.connect(alice).lockLaunchShare(aliceAmount, aliceProof)).to.be.revertedWith("E804");

    tx = await claimer.connect(bob).lockLaunchShare(bobAmount, bobProof);

    await expect(tx)
      .to.emit(claimer, "Lock")
      .withArgs(bob.address, bobAmount / 2);

    expect(await claimer.getReleasableAmount(bobAmount, bob.address, bobProof)).to.equal(0);
    expect(await claimer.totalLaunchShareLocked()).to.equal(aliceAmount / 2 + bobAmount / 2);

    // check admin cannot stake yet
    await expect(
      claimer.stake(
        reducedCliff, // 1 month
        standardCliff, // 3 months
        totalReducedVestingDuration,
        totalStandardVestingDuration // 6 months
      )
    ).to.be.revertedWith("E809");
  });

  it("users can claimCredit half (launch share) at TGE", async function () {
    // alice should not be able to claimCredit as staked launch share already
    await expect(claimer.connect(alice).claimCredit(aliceAmount, aliceProof)).to.be.revertedWith("NothingToClaim");

    // invalid proof
    await expect(claimer.connect(carol).claimCredit(carolAmount, aliceProof)).to.be.revertedWith("InvalidProof");

    // invalid amount
    await expect(claimer.connect(carol).claimCredit(carolAmount - 100, carolProof)).to.be.revertedWith("InvalidProof");

    expect(await creditToken.balanceOf(carol.address)).to.equal(0);
    expect(await claimer.getReleasableAmount(carolAmount, carol.address, carolProof)).to.equal(carolAmount / 2);

    tx = await claimer.connect(carol).claimCredit(carolAmount, carolProof);

    await expect(tx)
      .to.emit(claimer, "Claim")
      .withArgs(carol.address, carolAmount / 2);

    expect(await creditToken.balanceOf(carol.address)).to.equal(carolAmount / 2);
    expect(await claimer.getReleasableAmount(carolAmount, carol.address, carolProof)).to.equal(0);

    expect(await creditToken.balanceOf(claimer.address)).to.equal(totalAllocation - carolAmount / 2);
    expect(await claimer.totalClaimed()).to.equal(carolAmount / 2);

    // claiming again should revert
    await expect(claimer.connect(carol).claimCredit(carolAmount, carolProof)).to.be.revertedWith("NothingToClaim");

    // cannot now stake launch share
    await expect(claimer.connect(carol).lockLaunchShare(carolAmount, carolProof)).to.be.revertedWith("E803");
  });

  it("users cannot lock after lockingDecisionCutOff", async function () {
    // fast forwards time to after lockingDecisionCutOff
    await network.provider.send("evm_setNextBlockTimestamp", [cutOff + 1]);
    await network.provider.send("evm_mine", []);

    // cannot now lock
    await expect(claimer.connect(dave).lockLaunchShare(daveAmount, daveProof)).to.be.revertedWith("E805");
  });

  it("admin can stake credit tokens during cliff", async function () {
    await expect(
      claimer.stake(
        reducedCliff, // 1 month
        standardCliff, // 3 months
        0,
        totalStandardVestingDuration // 6 months
      )
    ).to.be.revertedWith("E810");

    await expect(
      claimer.stake(
        reducedCliff, // 1 month
        standardCliff, // 3 months
        totalReducedVestingDuration, // 4 months
        0
      )
    ).to.be.revertedWith("E810");

    await expect(
      claimer.stake(
        100,
        50,
        totalReducedVestingDuration, // 4 months
        totalStandardVestingDuration // 6 months
      )
    ).to.be.revertedWith("E811");

    await expect(claimer.stake(50, 100, 300, 200)).to.be.revertedWith("E812");

    await expect(
      claimer.stake(
        reducedCliff, // 1 month
        standardCliff, // 3 months
        reducedCliff, // 1 month
        totalStandardVestingDuration
      )
    ).to.be.revertedWith("E813");

    await expect(
      claimer.stake(
        reducedCliff, // 1 month
        totalStandardVestingDuration,
        totalReducedVestingDuration,
        totalStandardVestingDuration
      )
    ).to.be.revertedWith("E814");

    totalLaunchShareLocked = (await claimer.totalLaunchShareLocked()).toNumber();

    // triggers vesting start
    tx = await claimer.stake(
      reducedCliff, // 1 month
      standardCliff, // 3 months
      totalReducedVestingDuration, // 4 months
      totalStandardVestingDuration // 6 months
    );

    let block = await ethers.provider.getBlock(tx.blockHash);
    let vestingStart = block.timestamp;

    expect(await claimer.vestingStart()).to.equal(vestingStart);
    expect(await claimer.reducedVestingEnd()).to.equal(vestingStart + totalReducedVestingDuration);
    expect(await claimer.standardVestingEnd()).to.equal(vestingStart + totalStandardVestingDuration);
    expect(await claimer.reducedCliffDuration()).to.equal(reducedCliff);
    expect(await claimer.standardCliffDuration()).to.equal(standardCliff);

    expect(await creditStaking.totalAllocation()).to.equal(totalAllocation / 2 + totalLaunchShareLocked);
    expect(await claimer.totalLaunchShareLocked()).to.equal(aliceAmount / 2 + bobAmount / 2); // should remain unchanged
  });

  it("launch lockers can unlock after reducedCliff end and admin unstakes", async function () {
    // mocking adding some dividends to Credit Staking
    await tkn.mint(creditStaking.address, 100);
    await weth.mint(creditStaking.address, 100);
    await creditToken.mint(creditStaking.address, 100);

    await expect(claimer.connect(alice).unlockLaunchShare(aliceAmount, aliceProof)).to.be.revertedWith("E807");

    await expect(claimer.reducedCliffUnstake()).to.be.revertedWith("E815");

    let vestingStart = (await claimer.vestingStart()).toNumber();
    let reducedCliffDuration = (await claimer.reducedCliffDuration()).toNumber();

    // fast forward to reducedCliffEnd
    await network.provider.send("evm_setNextBlockTimestamp", [vestingStart + reducedCliffDuration]);
    await network.provider.send("evm_mine", []);

    await expect(claimer.connect(alice).reducedCliffUnstake()).to.be.revertedWith("E801");

    await claimer.reducedCliffUnstake();

    expect(await creditStaking.totalAllocation()).to.equal(totalAllocation / 2 - totalLaunchShareLocked);

    var expectedLockerRewards = (100 * totalLaunchShareLocked) / (totalAllocation / 2 + totalLaunchShareLocked); // 25%

    for (var i = 0; i < 3; i++) {
      expect(await claimer.rewardTokens(i)).to.equal(distributedTokens[i]);
      expect(await claimer.lockerRewards(distributedTokens[i])).to.equal(expectedLockerRewards);
    }

    // launch share lockers should be able to unlock
    tx = await claimer.connect(alice).unlockLaunchShare(aliceAmount, aliceProof);
    expect(await claimer.unstakedReducedCliffAmount()).to.equal(true);

    await expect(tx)
      .to.emit(claimer, "Unlock")
      .withArgs(alice.address, aliceAmount / 2);

    // calc expected rewards for alice and treasury
    aliceExpectedRewards = (aliceAmount / (aliceAmount + bobAmount)) * expectedLockerRewards;

    // check balances (including staking rewards)
    expect(await creditToken.balanceOf(alice.address)).to.equal(aliceExpectedRewards + aliceAmount / 2);
    expect(await weth.balanceOf(alice.address)).to.equal(aliceExpectedRewards);
    expect(await tkn.balanceOf(alice.address)).to.equal(aliceExpectedRewards);

    expectedTreasuryRewards = (100 * (totalAllocation / 2)) / (totalAllocation / 2 + totalLaunchShareLocked); // 75%
    expect(await creditToken.balanceOf(treasury.address)).to.equal(expectedTreasuryRewards);
    expect(await weth.balanceOf(treasury.address)).to.equal(expectedTreasuryRewards);
    expect(await tkn.balanceOf(treasury.address)).to.equal(expectedTreasuryRewards);

    // cannot unlock again
    await expect(claimer.connect(alice).unlockLaunchShare(aliceAmount, aliceProof)).to.be.revertedWith("E806");

    // those who did not stake their launch share cannot unlock
    await expect(claimer.connect(carol).unlockLaunchShare(carolAmount, carolProof)).to.be.revertedWith("E806");
  });

  it("launch lockers can start claiming vested tokens", async function () {
    let vestingStart = (await claimer.vestingStart()).toNumber();

    // fast forwards time by 2 months (reduced schedule at 50%, standard at 66.7%)
    await network.provider.send("evm_setNextBlockTimestamp", [vestingStart + 2 * reducedCliff]);
    await network.provider.send("evm_mine", []);
    await network.provider.send("evm_setAutomine", [false]);

    expect(await claimer.getReleasableAmount(aliceAmount, alice.address, aliceProof)).to.equal(0.5 * 0.5 * aliceAmount);
    expect(await claimer.getReleasableAmount(bobAmount, bob.address, bobProof)).to.equal(0.5 * 0.5 * bobAmount);
    expect(await claimer.getReleasableAmount(carolAmount, carol.address, carolProof)).to.equal(0); // claimed launch share
    expect(await claimer.getReleasableAmount(daveAmount, dave.address, daveProof)).to.equal(daveAmount / 2); // did not claim nor lock launch share

    let aliceCreditBalanceBefore = (await creditToken.balanceOf(alice.address)).toNumber();

    tx = await claimer.connect(alice).claimCredit(aliceAmount, aliceProof);

    await network.provider.send("evm_mine", []);
    await network.provider.send("evm_setAutomine", [true]);

    await expect(tx)
      .to.emit(claimer, "Claim")
      .withArgs(alice.address, aliceAmount / 4);

    expect(await creditToken.balanceOf(alice.address)).to.equal(aliceCreditBalanceBefore + 0.5 * 0.5 * aliceAmount);
    expect(await claimer.getReleasableAmount(aliceAmount, alice.address, aliceProof)).to.equal(0);
  });

  it("non launch lockers can claimCredit after standardCliff", async function () {
    // mocking adding some more dividends to Credit Staking
    await tkn.mint(creditStaking.address, 100);
    await weth.mint(creditStaking.address, 100);
    await creditToken.mint(creditStaking.address, 100);

    let totalLaunchShareLocked = (await claimer.totalLaunchShareLocked()).toNumber();

    let vestingStart = (await claimer.vestingStart()).toNumber();

    await expect(claimer.standardCliffUnstake()).to.be.revertedWith("E815");

    // fast forwards time by 1 month (reduced schedule at 75%, standard at 50%)
    await network.provider.send("evm_setNextBlockTimestamp", [vestingStart + standardCliff]);
    await network.provider.send("evm_mine", []);

    expect(await claimer.getReleasableAmount(aliceAmount, alice.address, aliceProof)).to.equal(
      0.25 * 0.5 * aliceAmount
    );
    expect(await claimer.getReleasableAmount(bobAmount, bob.address, bobProof)).to.equal(0.75 * 0.5 * bobAmount);

    // releasable amount for non launch lockers unchanged as admin yet to unstakeStandardCliff
    expect(await claimer.getReleasableAmount(carolAmount, carol.address, carolProof)).to.equal(0);
    expect(await claimer.getReleasableAmount(daveAmount, dave.address, daveProof)).to.equal(daveAmount / 2);

    let claimerCreditBalanceBefore = (await creditToken.balanceOf(claimer.address)).toNumber();

    await expect(claimer.connect(alice).standardCliffUnstake()).to.be.revertedWith("E801");

    await claimer.standardCliffUnstake();

    expect(await claimer.unstakedReducedCliffAmount()).to.equal(true);
    expect(await claimer.unstakedStandardCliffAmount()).to.equal(true);

    expect(await creditToken.balanceOf(claimer.address)).to.equal(
      claimerCreditBalanceBefore + totalAllocation / 2 - totalLaunchShareLocked
    );

    // staking rewards sent to treasury
    expect(await weth.balanceOf(treasury.address)).to.equal(expectedTreasuryRewards + 100);
    expect(await tkn.balanceOf(treasury.address)).to.equal(expectedTreasuryRewards + 100);
    expect(await creditToken.balanceOf(treasury.address)).to.equal(expectedTreasuryRewards + 100);

    expect(await creditToken.balanceOf(creditStaking.address)).to.equal(0);
    expect(await creditStaking.totalAllocation()).to.equal(0);

    expect(await claimer.getReleasableAmount(carolAmount, carol.address, carolProof)).to.equal(carolAmount / 4);
    expect(await claimer.getReleasableAmount(daveAmount, dave.address, daveProof)).to.equal((3 * daveAmount) / 4);

    let carolCreditBalanceBefore = (await creditToken.balanceOf(carol.address)).toNumber();

    await claimer.connect(carol).claimCredit(carolAmount, carolProof);
    expect(await creditToken.balanceOf(carol.address)).to.equal(carolCreditBalanceBefore + carolAmount / 4);
    expect(await claimer.getReleasableAmount(carolAmount, carol.address, carolProof)).to.equal(0);

    await claimer.connect(dave).claimCredit(daveAmount, daveProof);
    expect(await creditToken.balanceOf(dave.address)).to.equal((3 * daveAmount) / 4);
    expect(await claimer.getReleasableAmount(daveAmount, dave.address, daveProof)).to.equal(0);

    // fast forwards time to 100% way through both vesting schedules (6 months since vesting start)
    let standardVestingEnd = (await claimer.standardVestingEnd()).toNumber();
    await network.provider.send("evm_setNextBlockTimestamp", [standardVestingEnd]);
    await network.provider.send("evm_mine", []);

    expect(await claimer.getReleasableAmount(carolAmount, carol.address, carolProof)).to.equal(carolAmount / 4);
    expect(await claimer.getReleasableAmount(daveAmount, dave.address, daveProof)).to.equal(daveAmount / 4);
  });

  it("all tokens can be claimed", async function () {
    var bobExpectedRewards = 100 - expectedTreasuryRewards - aliceExpectedRewards;

    let tx = await claimer.connect(bob).unlockLaunchShare(bobAmount, bobProof);

    await expect(() => tx).to.changeTokenBalance(creditToken, bob, bobAmount / 2 + bobExpectedRewards);
    await expect(() => tx).to.changeTokenBalance(weth, bob, bobExpectedRewards);
    await expect(() => tx).to.changeTokenBalance(tkn, bob, bobExpectedRewards);

    await claimer.connect(alice).claimCredit(aliceAmount, aliceProof);
    await claimer.connect(bob).claimCredit(bobAmount, bobProof);
    await claimer.connect(carol).claimCredit(carolAmount, carolProof);
    await claimer.connect(dave).claimCredit(daveAmount, daveProof);

    expect(await creditToken.balanceOf(alice.address)).to.equal(aliceAmount + aliceExpectedRewards);
    expect(await creditToken.balanceOf(bob.address)).to.equal(bobAmount + bobExpectedRewards);
    expect(await creditToken.balanceOf(carol.address)).to.equal(carolAmount);
    expect(await creditToken.balanceOf(dave.address)).to.equal(daveAmount);

    expect(await creditToken.balanceOf(claimer.address)).to.equal(0);

    expect(await claimer.getReleasableAmount(aliceAmount, alice.address, aliceProof)).to.equal(0);
    expect(await claimer.getReleasableAmount(bobAmount, bob.address, bobProof)).to.equal(0);
    expect(await claimer.getReleasableAmount(carolAmount, carol.address, carolProof)).to.equal(0);
    expect(await claimer.getReleasableAmount(daveAmount, dave.address, daveProof)).to.equal(0);
  });

  it("owner can set admin", async function () {
    expect(await claimer.admin()).to.equal(ethers.constants.AddressZero);

    // only owner can call
    await expect(claimer.connect(alice).setAdmin(admin.address)).to.be.revertedWith("Ownable: caller is not the owner");

    await claimer.connect(owner).setAdmin(admin.address);
    expect(await claimer.admin()).to.equal(admin.address);

    // only owner can call
    await expect(claimer.connect(admin).setAdmin(bob.address)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("owner can emergency withdraw", async function () {
    await weth.mint(claimer.address, 300);
    await tkn.mint(claimer.address, 500);

    expect(await weth.balanceOf(claimer.address)).to.equal(300);
    expect(await tkn.balanceOf(claimer.address)).to.equal(500);
    expect(await weth.balanceOf(owner.address)).to.equal(0);
    expect(await tkn.balanceOf(owner.address)).to.equal(0);

    // only owner can call
    await expect(claimer.connect(admin).emergencyWithdraw([weth.address, tkn.address])).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    await claimer.emergencyWithdraw([weth.address, tkn.address]);

    expect(await weth.balanceOf(claimer.address)).to.equal(0);
    expect(await tkn.balanceOf(claimer.address)).to.equal(0);
    expect(await weth.balanceOf(owner.address)).to.equal(300);
    expect(await tkn.balanceOf(owner.address)).to.equal(500);
  });

  it("owner or admin can set merkle root", async function () {
    expect(await claimer.merkleRoot()).to.equal(rootHash);

    // only owner or admin can call
    await expect(claimer.connect(bob).setRoot(newRootHash)).to.be.revertedWith("E801");

    await claimer.setRoot(newRootHash);
    expect(await claimer.merkleRoot()).to.equal(newRootHash);

    await claimer.connect(admin).setRoot(rootHash);
    expect(await claimer.merkleRoot()).to.equal(rootHash);
  });

  it("owner or admin can set stakingDecisionCutOff", async function () {
    await claimer.connect(admin).setLockingDecisionCutOff(1000);
    expect(await claimer.lockingDecisionCutOff()).to.equal(1000);
  });

  it("owner or admin can set unstake statuses", async function () {
    expect(await claimer.unstakedReducedCliffAmount()).to.equal(true);
    expect(await claimer.unstakedStandardCliffAmount()).to.equal(true);

    await claimer.connect(admin).setUnstakeStatuses(false, false);
    expect(await claimer.unstakedReducedCliffAmount()).to.equal(false);
    expect(await claimer.unstakedStandardCliffAmount()).to.equal(false);
  });
});

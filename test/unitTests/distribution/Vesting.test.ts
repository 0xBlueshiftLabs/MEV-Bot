import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ethers, network } from "hardhat";
import { ZERO_ADDRESS, currentTimestamp, days, units } from "./utils";

const { expect } = chai;

chai.use(solidity);

const vesting_controller_role = "0xc23e4cf9f9c5137c948ad4a95211794895d43271639a97b001bd23951d54c84a";

describe("Vesting", () => {
  let owner: SignerWithAddress, user1: SignerWithAddress, user2: SignerWithAddress, user3: SignerWithAddress;
  let token, vesting;
  let vestingDelay = days(1);
  let vestingStart: number;
  let cliffDuration = days(1);
  let vestingDuration = days(2 * 365);

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    owner = accounts[0];
    user1 = accounts[1];
    user2 = accounts[2];
    user3 = accounts[3];

    const TestToken = await ethers.getContractFactory("TestToken");
    token = await TestToken.deploy("credit", "CRED", units(1000000000)); // 1B TestToken
    await token.deployed();
    const Vesting = await ethers.getContractFactory("Vesting");
    vestingStart = (await currentTimestamp()) + vestingDelay;

    await expect(Vesting.deploy(ZERO_ADDRESS)).to.be.revertedWith("Invalid token");

    vesting = await Vesting.deploy(token.address);
    await vesting.deployed();

    await vesting.grantRole(vesting_controller_role, owner.address);
  });

  it("should allow members of the vesting_controller role to vest tokens", async () => {
    await token.approve(vesting.address, units(1000000000));

    await expect(
      vesting.vestTokens(ZERO_ADDRESS, units(1000000000), vestingStart, cliffDuration, vestingDuration)
    ).to.be.revertedWith("E1101");

    await expect(vesting.vestTokens(user1.address, 0, vestingStart, cliffDuration, vestingDuration)).to.be.revertedWith(
      "E1103"
    );

    await expect(
      vesting.vestTokens(user1.address, units(1000000000), 0, cliffDuration, vestingDuration)
    ).to.be.revertedWith("E1104");

    await expect(
      vesting.vestTokens(user1.address, units(1000000000), vestingStart, vestingDuration, vestingDuration)
    ).to.be.revertedWith("E1106");

    await expect(
      vesting.vestTokens(user1.address, units(1000000000), vestingStart, cliffDuration, 0)
    ).to.be.revertedWith("E1105");

    await vesting.vestTokens(user1.address, units(1000000000), vestingStart, cliffDuration, vestingDuration);

    const schedule = await vesting.vestingSchedules(user1.address);
    expect(schedule.totalAllocation).to.equal(units(1000000000));
    expect(schedule.start).to.equal(vestingStart);
    expect(schedule.cliffDuration).to.equal(cliffDuration);
    expect(schedule.duration).to.equal(vestingDuration);
    expect(schedule.released).to.equal(0);

    await expect(
      vesting.vestTokens(user1.address, units(1000000000), vestingStart, cliffDuration, vestingDuration)
    ).to.be.revertedWith("E1102");
  });

  it("shouldn't allow to release vested tokens before vesting starts", async () => {
    await token.approve(vesting.address, units(1000000000));
    await vesting.vestTokens(user1.address, units(1000000000), vestingStart, 0, vestingDuration);

    expect(await vesting.releasableAmount(user1.address)).to.equal(0);
  });

  it("should allow users to release", async () => {
    await token.approve(vesting.address, units(1000000000));
    await vesting.vestTokens(user1.address, units(1000000000), vestingStart, 0, vestingDuration);

    await network.provider.send("evm_setNextBlockTimestamp", [vestingStart + vestingDuration / 2]);
    await network.provider.send("evm_mine", []);
    const releasableAmount = await vesting.releasableAmount(user1.address);
    const lockedAmount = await vesting.lockedAmount(user1.address);
    const vestedAmount = await vesting.vestedAmount(user1.address);

    expect(releasableAmount).to.equal(vestedAmount);
    expect(releasableAmount).to.be.closeTo(lockedAmount, units(100) as any);
    expect(releasableAmount).to.be.closeTo(units(1000000000).div(2), units(100) as any);

    await expect(vesting.release()).to.be.revertedWith("E1109");

    expect(await vesting.getTotalReleased()).to.equal(0);

    await vesting.connect(user1).release();

    // totalReleased should have increased
    expect(await vesting.getTotalReleased()).to.be.closeTo(lockedAmount, units(100) as any);

    //a second has passed since we called the releasableAmount function
    expect(await token.balanceOf(user1.address)).to.be.closeTo(releasableAmount, units(100) as any);
    expect(await vesting.releasableAmount(user1.address)).to.be.closeTo(units(0), units(100) as any);
    expect(await vesting.lockedAmount(user1.address)).to.be.closeTo(lockedAmount, units(100) as any);
    expect(await vesting.vestedAmount(user1.address)).to.be.closeTo(vestedAmount, units(100) as any);
  });

  it("should not emit tokens during the cliff period", async () => {
    await token.approve(vesting.address, units(1000000000));
    await vesting.vestTokens(user1.address, units(1000000000), vestingStart, cliffDuration, vestingDuration);

    await network.provider.send("evm_setNextBlockTimestamp", [vestingStart + cliffDuration / 2]);
    await network.provider.send("evm_mine", []);
    expect(await vesting.releasableAmount(user1.address)).to.equal(0);
    await network.provider.send("evm_setNextBlockTimestamp", [vestingStart + cliffDuration]);
    await network.provider.send("evm_mine", []);
    expect(await vesting.releasableAmount(user1.address)).to.be.closeTo(units(1369863), units(100) as any);
  });

  it("should allow to claim all the tokens after vesting is over", async () => {
    await token.approve(vesting.address, units(1000000000));
    await vesting.vestTokens(user1.address, units(1000000000), vestingStart, cliffDuration, vestingDuration);

    await network.provider.send("evm_setNextBlockTimestamp", [vestingStart + vestingDuration - 1]);
    await network.provider.send("evm_mine", []);

    expect(await vesting.releasableAmount(user1.address)).to.be.closeTo(units(1000000000), units(100) as any);
    await network.provider.send("evm_mine", []);
    expect(await vesting.releasableAmount(user1.address)).to.equal(units(1000000000));
    await vesting.connect(user1).release();
    expect(await token.balanceOf(user1.address)).to.equal(units(1000000000));
  });

  it("should allow the owner to revoke tokens", async () => {
    await token.approve(vesting.address, units(1000000000));
    await vesting.vestTokens(user1.address, units(500000000), vestingStart, cliffDuration, vestingDuration);

    await vesting.vestTokens(user2.address, units(500000000), vestingStart, cliffDuration, vestingDuration);

    await expect(vesting.revoke(owner.address)).to.be.revertedWith("E1107");

    await network.provider.send("evm_setNextBlockTimestamp", [vestingStart + vestingDuration / 2]);

    await vesting.connect(user1).release();
    await vesting.revoke(user1.address);
    expect(await token.balanceOf(owner.address)).to.be.closeTo(units(250000000), units(100) as any);

    await network.provider.send("evm_setNextBlockTimestamp", [vestingStart + vestingDuration]);
    await network.provider.send("evm_mine", []);

    await vesting.connect(user2).release();
    await expect(vesting.revoke(user2.address)).to.be.revertedWith("E1108");
  });
});

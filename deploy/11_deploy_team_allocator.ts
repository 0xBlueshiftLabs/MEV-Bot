import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ethers, upgrades } from "hardhat";
import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { log } = deployments;

  const creditTokenAddress = (await deployments.get("CreditToken")).address;
  const vestingAddress = (await deployments.get("Vesting")).address;
  const creditStakingAddress = (await deployments.get("CreditStaking")).address;

  const TeamAllocator = await ethers.getContractFactory("TeamAllocator");

  const teamAllocator = await upgrades.deployProxy(
    TeamAllocator,
    [creditTokenAddress, vestingAddress, creditStakingAddress],
    {
      initializer: "initialize",
    }
  );
  await teamAllocator.deployed();

  log("TeamAllocator deployed:", teamAllocator.address);
  deployments.save("TeamAllocator", { abi: [], address: teamAllocator.address });
};

export default func;
func.tags = ["TeamAllocator"];
func.dependencies = ["CreditToken", "Vesting", "CreditStaking"];

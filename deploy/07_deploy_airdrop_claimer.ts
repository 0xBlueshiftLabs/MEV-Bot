import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ethers, upgrades } from "hardhat";
import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const merkleRoot = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"; // TODO: add merkle root
  const creditTokenAddress = (await deployments.get("CreditToken")).address;
  const creditStaking = (await deployments.get("CreditStaking")).address;
  const treasuryAddress = deployer; // TODO: add treasury address
  const totalContractAllocation = ethers.utils.parseEther("100000"); // 100_000 $CREDIT

  const AirdropClaimer = await ethers.getContractFactory("Claimer");

  const airdropClaimer = await upgrades.deployProxy(
    AirdropClaimer,
    [merkleRoot, creditTokenAddress, creditStaking, treasuryAddress, totalContractAllocation],
    {
      initializer: "initialize",
    }
  );
  await airdropClaimer.deployed();

  log("AirdropClaimer deployed:", airdropClaimer.address);
  deployments.save("AirdropClaimer", { abi: [], address: airdropClaimer.address });
};

export default func;
func.tags = ["AirdropClaimer"];
func.dependencies = ["CreditToken", "CreditStaking"];

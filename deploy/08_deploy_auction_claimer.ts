import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ethers, upgrades } from "hardhat";
import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { log } = deployments;
  const { deployer } = await getNamedAccounts();

  const merkleRoot = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"; // TODO: add merkle root
  const creditTokenAddress = (await deployments.get("CreditToken")).address;
  const creditStaking = (await deployments.get("CreditStaking")).address;
  const treasuryAddress = deployer; // TODO: add treasury address
  const totalContractAllocation = ethers.utils.parseEther("100000"); // 100_000 $CREDIT

  const AuctionClaimer = await ethers.getContractFactory("Claimer");

  const auctionClaimer = await upgrades.deployProxy(
    AuctionClaimer,
    [merkleRoot, creditTokenAddress, creditStaking, treasuryAddress, totalContractAllocation],
    {
      initializer: "initialize",
    }
  );
  await auctionClaimer.deployed();

  log("AuctionClaimer deployed:", auctionClaimer.address);
  deployments.save("AuctionClaimer", { abi: [], address: auctionClaimer.address });
};

export default func;
func.tags = ["AuctionClaimer"];
func.dependencies = ["CreditToken", "CreditStaking"];

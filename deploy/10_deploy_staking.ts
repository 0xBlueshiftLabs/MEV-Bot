import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ethers, upgrades } from "hardhat";
import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const creditTokenAddress = (await deployments.get("CreditToken")).address;
  const wethAddress = (await deployments.get("WETH")).address;

  let tokenAddress;
  if ((await hre.getChainId()) === "421613") {
    tokenAddress = ""; // TODO: deploy an ERC20
  } else {
    tokenAddress = "0xd2568acCD10A4C98e87c44E9920360031ad89fCB";
  }

  const CreditStaking = await ethers.getContractFactory("CreditStaking");

  const blockNumBefore = await ethers.provider.getBlockNumber();
  const blockBefore = await ethers.provider.getBlock(blockNumBefore);
  const timestampBefore = blockBefore.timestamp;

  const startTime = timestampBefore; // 05/25/2023 @ 12:00am (UTC) TODO: Replace with start time
  const currentCycleDurationSeconds = 2630016; // 1 month (30.44 days)
  const unstakingPenalties = [0, 2500, 5000, 7500]; // 0%, 25%, 50%, 75%
  const treasuryAddress = deployer; // TODO: Replace with treasury address

  const creditStaking = await upgrades.deployProxy(
    CreditStaking,
    [creditTokenAddress, startTime, currentCycleDurationSeconds, unstakingPenalties, treasuryAddress, wethAddress],
    {
      initializer: "initialize",
    }
  );
  await creditStaking.deployed();

  log("CreditStaking deployed:", creditStaking.address);
  deployments.save("CreditStaking", { abi: [], address: creditStaking.address });

  // init CreditStaking in dependencies
  const alphaPoolFactoryAddress = (await deployments.get("AlphaPoolFactory")).address;
  const alphaPoolFactory = await ethers.getContractAt("AlphaPoolFactory", alphaPoolFactoryAddress);
  await alphaPoolFactory.setCreditStaking(creditStaking.address);

  await creditStaking.enableDistributedToken(wethAddress);
  await creditStaking.enableDistributedToken(creditTokenAddress);
  await creditStaking.enableDistributedToken(tokenAddress);
};

export default func;
func.tags = ["CreditStaking"];
func.dependencies = ["CreditToken", "WETH", "AlphaPoolFactory"];

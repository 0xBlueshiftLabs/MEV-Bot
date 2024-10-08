import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ethers, upgrades } from "hardhat";
import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;

  const creditTokenAddress = (await deployments.get("CreditToken")).address;

  const LPFarming = await ethers.getContractFactory("LPFarming");

  const lpFarming = await upgrades.deployProxy(LPFarming, [creditTokenAddress], {
    initializer: "initialize",
  });
  await lpFarming.deployed();

  log("LPFarming deployed:", lpFarming.address);
  deployments.save("LPFarming", { abi: [], address: lpFarming.address });
};

export default func;
func.tags = ["LPFarming"];
func.dependencies = ["CreditToken"];

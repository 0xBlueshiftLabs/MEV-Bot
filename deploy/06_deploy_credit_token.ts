import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ethers, upgrades } from "hardhat";
import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { log } = deployments;

  const CreditToken = await ethers.getContractFactory("CreditToken");

  const creditToken = await upgrades.deployProxy(CreditToken, ["Credit", "CREDIT"], { initializer: "initialize" });
  await creditToken.deployed();

  log("CreditToken deployed:", creditToken.address);
  deployments.save("CreditToken", { abi: [], address: creditToken.address });

  // init CreditToken in dependencies
  const alphaPoolFactoryAddress = (await deployments.get("AlphaPoolFactory")).address;
  const alphaPoolFactory = await ethers.getContractAt("AlphaPoolFactory", alphaPoolFactoryAddress);
  await alphaPoolFactory.setCreditToken(creditToken.address);
};

export default func;
func.tags = ["CreditToken"];
func.dependencies = ["AlphaPoolFactory"];

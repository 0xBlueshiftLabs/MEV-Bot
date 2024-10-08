import { HardhatRuntimeEnvironment } from "hardhat/types";

import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const creditTokenAddress = (await deployments.get("CreditToken")).address;

  const vestingAddress = await deploy("Vesting", {
    from: deployer,
    args: [creditTokenAddress],
    log: true,
  });
  console.log("Vesting contract deployed at:", vestingAddress.address);
};

export default func;
func.tags = ["Vesting"];
func.dependencies = ["CreditToken"];

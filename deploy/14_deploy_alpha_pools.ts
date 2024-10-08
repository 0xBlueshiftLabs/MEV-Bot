import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ethers, upgrades } from "hardhat";
import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // get block timestamp
  const now = (await ethers.provider.getBlock("latest")).timestamp;

  const depositStart = now + 24 * 3600; // TODO: set deposit start - start next day
  const loanStart = now + 7 * 24 * 3600; // TODO: set loan start - 7 day window
  const treasury = deployer; // TODO: set treasury
  const poolOwner = deployer; // TODO: set pool owner
  const wethAddress = (await deployments.get("WETH")).address;

  const alpha = await deploy("AlphaPool", {
    from: deployer,
    log: true,
  });

  const beacon = await deploy("UpgradeableBeacon", {
    from: deployer,
    args: [alpha.address],
  });

  const AlphaPoolFactory = await ethers.getContractFactory("AlphaPoolFactory");

  const alphaPoolFactory = await upgrades.deployProxy(
    AlphaPoolFactory,
    [depositStart, loanStart, beacon.address, treasury, poolOwner, wethAddress],
    {
      initializer: "initialize",
    }
  );

  await alphaPoolFactory.deployed();
  deployments.save("AlphaPoolFactory", { abi: [], address: alphaPoolFactory.address });
  console.log("AlphaPoolFactory deployed: ", alphaPoolFactory.address);
};

export default func;
func.tags = ["AlphaPoolFactory"];
func.dependencies = ["WETH"];

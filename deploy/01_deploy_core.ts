import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ethers, upgrades } from "hardhat";
import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  // 9% fee per year
  const fee = 1248; // 40% of 9% fee per year
  const protocolFee = 936; // 30% of 9% fee per year
  const stakingFee = 936; // 30% of 9% fee per year
  const pairCreator = deployer; // TODO: set pair creator
  const protocolFeeCollector = deployer; // TODO: set protocol fee collector

  const CreditMath = await deploy("CreditMath", {
    from: deployer,
    log: true,
  });

  const pair = await deploy("CreditPair", {
    from: deployer,
    log: true,
    libraries: {
      CreditMath: CreditMath.address,
    },
  });

  const beacon = await deploy("UpgradeableBeacon", {
    from: deployer,
    args: [pair.address],
  });

  const distributorAddress = (await deployments.get("Distributor")).address;

  const CreditFactory = await ethers.getContractFactory("CreditFactory");

  const creditFactory = await upgrades.deployProxy(
    CreditFactory,
    [pairCreator, protocolFeeCollector, distributorAddress, beacon.address, fee, protocolFee, stakingFee],
    {
      initializer: "initialize",
    }
  );
  await creditFactory.deployed();

  log("CreditFactory deployed:", creditFactory.address);
  deployments.save("CreditFactory", { abi: [], address: creditFactory.address });
};

export default func;
func.tags = ["Core"];
func.dependencies = ["Distributor"];

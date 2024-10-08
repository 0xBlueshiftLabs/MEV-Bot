import { ethers, upgrades } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const factoryAddress = (await deployments.get("CreditFactory")).address;

  const creditPositionAddress = (await deployments.get("CreditPosition")).address;
  const creditPosition = await ethers.getContractAt("CreditPosition", creditPositionAddress);

  const deployLiquidityAddress = (await deployments.get("DeployLiquidity")).address;
  const deployLoansAddress = (await deployments.get("DeployLoans")).address;
  const deployCoveragesAddress = (await deployments.get("DeployCoverages")).address;
  const deployLockedDebtAddress = (await deployments.get("DeployLockedDebt")).address;

  let wethAddress: string = (await deployments.get("WETH")).address;
  console.log("Weth address", wethAddress);

  const Borrow = await deploy("Borrow", {
    from: deployer,
    log: true,
    libraries: {
      DeployLiquidity: deployLiquidityAddress,
      DeployLoans: deployLoansAddress,
      DeployCoverages: deployCoveragesAddress,
      DeployLockedDebt: deployLockedDebtAddress,
    },
  });
  console.log("Borrow", Borrow.address);

  const Lend = await deploy("Lend", {
    from: deployer,
    log: true,
    libraries: {
      DeployLiquidity: deployLiquidityAddress,
      DeployLoans: deployLoansAddress,
      DeployCoverages: deployCoveragesAddress,
      DeployLockedDebt: deployLockedDebtAddress,
    },
  });

  const Mint = await deploy("Mint", {
    from: deployer,
    log: true,
    libraries: {
      DeployLiquidity: deployLiquidityAddress,
      DeployLoans: deployLoansAddress,
      DeployCoverages: deployCoveragesAddress,
      DeployLockedDebt: deployLockedDebtAddress,
    },
  });

  const Burn = await deploy("Burn", {
    from: deployer,
    log: true,
  });

  const Pay = await deploy("Pay", {
    from: deployer,
    log: true,
  });

  const Withdraw = await deploy("Withdraw", {
    from: deployer,
    log: true,
  });

  const Router = await ethers.getContractFactory("CreditRouter", {
    libraries: {
      DeployLiquidity: deployLiquidityAddress,
      DeployLoans: deployLoansAddress,
      DeployCoverages: deployCoveragesAddress,
      DeployLockedDebt: deployLockedDebtAddress,
      Borrow: Borrow.address,
      Lend: Lend.address,
      Mint: Mint.address,
      Burn: Burn.address,
      Pay: Pay.address,
      Withdraw: Withdraw.address,
    },
  });

  const router = await upgrades.deployProxy(Router, [factoryAddress, wethAddress, creditPosition.address], {
    initializer: "initialize",
    unsafeAllow: ["external-library-linking"],
  });
  await router.deployed();

  console.log("Router deployed: ", router.address);
  deployments.save("Router", { abi: [], address: router.address });

  // init router in Factory
  const factory = await ethers.getContractAt("CreditFactory", factoryAddress);
  await factory.setPairCreator(router.address);

  await creditPosition.grantRoles(router.address, router.address);
};

export default func;
func.tags = ["Router"];
func.dependencies = ["CreditFactory", "ReceiptTokens", "CreditPosition"];

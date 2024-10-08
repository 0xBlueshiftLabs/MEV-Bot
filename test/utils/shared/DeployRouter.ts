import { ethers, upgrades } from "hardhat";

import { CreditPosition } from "../../../typechain";
import type { CreditFactory } from "../../../typechain/CreditFactory";
import type { CreditRouter as RouterContract } from "../../../typechain/CreditRouter";
import type { TestToken } from "../../../typechain/TestToken";
import type { WETH9 as WethContract } from "../../../typechain/WETH9";
import { FEE, PROTOCOL_FEE, STAKING_FEE } from "./Constants";

export async function deploy(
  assetToken: TestToken,
  collateralToken: TestToken,
  maturity: bigint,
  creditPosition: CreditPosition,
  factory?: CreditFactory
) {
  const accounts = await ethers.getSigners();

  const deployLibraryContractAddresses: string[] = [];

  const deployLiquidity = await ethers.getContractFactory("DeployLiquidity");

  const deployLiquidityContract = await deployLiquidity.deploy();
  await deployLiquidityContract.deployTransaction.wait();
  deployLibraryContractAddresses.push(deployLiquidityContract.address);

  const deployLoans = await ethers.getContractFactory("DeployLoans");

  const deployLoansContract = await deployLoans.deploy();
  await deployLoansContract.deployTransaction.wait();
  deployLibraryContractAddresses.push(deployLoansContract.address);

  const deployCoverages = await ethers.getContractFactory("DeployCoverages");

  const deployCoveragesContract = await deployCoverages.deploy();
  await deployCoveragesContract.deployTransaction.wait();
  deployLibraryContractAddresses.push(deployCoveragesContract.address);

  const deployLockedDebt = await ethers.getContractFactory("DeployLockedDebt");
  const deployLockedDebtContract = await deployLockedDebt.deploy();
  await deployLockedDebtContract.deployTransaction.wait();
  deployLibraryContractAddresses.push(deployLockedDebtContract.address);

  const libraryNames1 = ["Borrow", "Lend", "Mint"];
  const libraryContractAddresses1: string[] = [];

  for (const library of libraryNames1) {
    const name = await ethers.getContractFactory(library, {
      libraries: {
        DeployLiquidity: deployLibraryContractAddresses[0],
        DeployLoans: deployLibraryContractAddresses[1],
        DeployCoverages: deployLibraryContractAddresses[2],
        DeployLockedDebt: deployLibraryContractAddresses[3],
      },
    });
    const contract = await name.deploy();
    await contract.deployTransaction.wait();
    libraryContractAddresses1.push(contract.address);
  }

  const libraryNames2 = ["Burn", "Pay", "Withdraw"];
  const libraryContractAddresses2: string[] = [];

  for (const library of libraryNames2) {
    const name = await ethers.getContractFactory(library);
    const contract = await name.deploy();
    await contract.deployTransaction.wait();
    libraryContractAddresses2.push(contract.address);
  }

  const Router = await ethers.getContractFactory("CreditRouter", {
    libraries: {
      Borrow: libraryContractAddresses1[0],
      DeployLiquidity: deployLibraryContractAddresses[0],
      DeployLoans: deployLibraryContractAddresses[1],
      DeployCoverages: deployLibraryContractAddresses[2],
      DeployLockedDebt: deployLibraryContractAddresses[3],
      Lend: libraryContractAddresses1[1],
      Mint: libraryContractAddresses1[2],
      Burn: libraryContractAddresses2[0],
      Pay: libraryContractAddresses2[1],
      Withdraw: libraryContractAddresses2[2],
    },
  });
  const WETH9 = await ethers.getContractFactory("WETH9");

  const CreditMathFactory = await ethers.getContractFactory("CreditMath");
  const CreditMath = await CreditMathFactory.deploy();

  const creditPairFactory = await ethers.getContractFactory("CreditPair", {
    libraries: { CreditMath: CreditMath.address },
  });
  const upgradeableBeaconFactory = await ethers.getContractFactory("UpgradeableBeacon");

  const creditPair = await creditPairFactory.deploy();

  const upgradeableBeacon = await upgradeableBeaconFactory.deploy(creditPair.address);

  await CreditMath.deployTransaction.wait();
  const Factory = await ethers.getContractFactory("CreditFactory");

  let factoryContract: any;

  if (factory != undefined) {
    factoryContract = factory;
  } else {
    factoryContract = (await Factory.deploy(
      accounts[0].address,
      FEE,
      PROTOCOL_FEE,
      STAKING_FEE,
      upgradeableBeacon.address,
      accounts[0].address
    )) as CreditFactory;
    await factoryContract.deployTransaction.wait();
  }

  const wethContract = (await WETH9.deploy()) as WethContract;
  await wethContract.deployTransaction.wait();

  const beacon = await upgrades.deployBeacon(Router, { unsafeAllow: ["external-library-linking"] });
  await beacon.deployed();

  const routerContract = (await upgrades.deployBeaconProxy(beacon, Router, [
    factoryContract.address,
    wethContract.address,
    creditPosition.address,
  ])) as RouterContract;

  const deployedContracts = {
    factory: factoryContract,
    router: routerContract,
    weth: wethContract,
  };
  return deployedContracts;
}

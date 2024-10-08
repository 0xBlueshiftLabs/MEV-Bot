import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, upgrades } from "hardhat";
import { CreditFactory, CreditPosition, CreditRouter, WETH9 } from "../../../typechain";

export interface DeploymentContextForExistingTokens {
  creditPosition: CreditPosition;
  router: CreditRouter;
  assetToken: any;
  collateralToken: any;
}

export async function createDeploymentContextFixtureForDeployedTokens(
  deployer: SignerWithAddress,
  distributor,
  assetAddress,
  collateralAddress
): Promise<DeploymentContextForExistingTokens> {
  const assetToken = await ethers.getContractAt("IERC20", assetAddress);
  const collateralToken = await ethers.getContractAt("IERC20", collateralAddress);

  const creditPosition = await deployCreditPosition();
  const { router, factory } = await deployRouter(deployer, creditPosition, distributor);

  // change the pair creator to the router address
  await factory.setPairCreator(router.address);

  await initCreditPosition(creditPosition, router.address);

  await assetToken.approve(router.address, ethers.constants.MaxUint256);
  await collateralToken.approve(router.address, ethers.constants.MaxUint256);

  return { router, creditPosition, assetToken, collateralToken };
}

async function deployRouter(
  deployer: SignerWithAddress,
  creditPosition: CreditPosition,
  distributor
): Promise<{ router: CreditRouter; factory: CreditFactory }> {
  const LiquidityNFTSVG = await ethers.getContractFactory("LiquidityNFTSVG");
  const liquidityNFTSVG = await LiquidityNFTSVG.deploy();
  await liquidityNFTSVG.deployTransaction.wait();

  const DebtNFTSVG = await ethers.getContractFactory("DebtNFTSVG");
  const debtNFTSVG = await DebtNFTSVG.deploy();
  await debtNFTSVG.deployTransaction.wait();

  const CreditNFTSVG = await ethers.getContractFactory("CreditNFTSVG");
  const creditNFTSVG = await CreditNFTSVG.deploy();
  await creditNFTSVG.deployTransaction.wait();

  const nftTokenURI = await ethers.getContractFactory("NFTTokenURIScaffold", {
    libraries: {
      LiquidityNFTSVG: liquidityNFTSVG.address,
      DebtNFTSVG: debtNFTSVG.address,
      CreditNFTSVG: creditNFTSVG.address,
    },
  });
  const nftTokenURIContract = await nftTokenURI.deploy();
  await nftTokenURIContract.deployTransaction.wait();

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

  let factoryContract = (await Factory.deploy()) as CreditFactory;
  factoryContract.initialize(deployer.address, deployer.address, distributor, upgradeableBeacon.address, 100, 50, 50);

  const wethContract = (await WETH9.deploy()) as WETH9;

  const beacon = await upgrades.deployBeacon(Router, { unsafeAllow: ["external-library-linking"] });
  await beacon.deployed();

  const routerContract = (await upgrades.deployBeaconProxy(beacon, Router, [
    factoryContract.address,
    wethContract.address,
    creditPosition.address,
  ])) as CreditRouter;

  return { router: routerContract, factory: factoryContract };
}

async function deployCreditPosition(): Promise<CreditPosition> {
  const LiquidityNFTSVG = await ethers.getContractFactory("LiquidityNFTSVG");
  const liquidityNFTSVG = await LiquidityNFTSVG.deploy();
  await liquidityNFTSVG.deployTransaction.wait();

  const DebtNFTSVG = await ethers.getContractFactory("DebtNFTSVG");
  const debtNFTSVG = await DebtNFTSVG.deploy();
  await debtNFTSVG.deployTransaction.wait();

  const CreditNFTSVG = await ethers.getContractFactory("CreditNFTSVG");
  const creditNFTSVG = await CreditNFTSVG.deploy();
  await creditNFTSVG.deployTransaction.wait();

  const NFTTokenURIScaffold = await ethers.getContractFactory("NFTTokenURIScaffold", {
    libraries: {
      LiquidityNFTSVG: liquidityNFTSVG.address,
      DebtNFTSVG: debtNFTSVG.address,
      CreditNFTSVG: creditNFTSVG.address,
    },
  });
  const nftTokenURIScaffold = await NFTTokenURIScaffold.deploy();
  await nftTokenURIScaffold.deployTransaction.wait();

  const CreditPosition = await ethers.getContractFactory("CreditPosition", {
    libraries: {
      NFTTokenURIScaffold: nftTokenURIScaffold.address,
    },
  });

  const creditPosition = (await CreditPosition.deploy()) as CreditPosition;
  await creditPosition.deployTransaction.wait();
  return creditPosition;
}

async function initCreditPosition(creditPosition: CreditPosition, routerAddress: string) {
  await creditPosition.initialize("CreditPosition", "CP");
  await creditPosition.grantRoles(routerAddress, routerAddress);
}

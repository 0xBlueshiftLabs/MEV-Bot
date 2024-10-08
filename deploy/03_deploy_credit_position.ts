import { ethers, upgrades } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const factoryAddress = (await deployments.get("CreditFactory")).address;

  let wethAddress: string = (await deployments.get("WETH")).address;
  console.log("Weth address", wethAddress);

  const LiquidityNFTSVG = await deploy("LiquidityNFTSVG", {
    from: deployer,
    log: true,
  });

  const DebtNFTSVG = await deploy("DebtNFTSVG", {
    from: deployer,
    log: true,
  });

  const CreditNFTSVG = await deploy("CreditNFTSVG", {
    from: deployer,
    log: true,
  });

  const NFTTokenURIScaffold = await deploy("NFTTokenURIScaffold", {
    from: deployer,
    log: true,
    libraries: {
      LiquidityNFTSVG: LiquidityNFTSVG.address,
      DebtNFTSVG: DebtNFTSVG.address,
      CreditNFTSVG: CreditNFTSVG.address,
    },
  });

  const CreditPosition = await ethers.getContractFactory("CreditPosition", {
    libraries: {
      NFTTokenURIScaffold: NFTTokenURIScaffold.address,
    },
  });

  const creditPosition = await upgrades.deployProxy(CreditPosition, [factoryAddress, wethAddress], {
    initializer: "initialize",
    unsafeAllow: ["external-library-linking"],
  });

  await creditPosition.deployed();
  deployments.save("CreditPosition", { abi: [], address: creditPosition.address });
  console.log("CreditPosition deployed: ", creditPosition.address);

  // setting CreditPosition address
  const farmingAddress = (await deployments.get("LPFarming")).address;
  const farming = await ethers.getContractAt("LPFarming", farmingAddress);
  farming.setCreditPosition(creditPosition.address);
};

export default func;
func.tags = ["CreditPosition"];
func.dependencies = ["Core", "ReceiptTokens", "LPFarming"];

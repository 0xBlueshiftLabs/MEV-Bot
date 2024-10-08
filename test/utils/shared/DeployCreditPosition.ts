import { ethers } from "hardhat";
import { CreditPosition } from "../../../typechain";

export async function deployCreditPosition(): Promise<CreditPosition> {
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

export async function initCreditPosition(creditPosition: CreditPosition, routerAddress: string) {
  await creditPosition.initialize("CreditPosition", "CP");
  await creditPosition.grantRoles(routerAddress, routerAddress);
}

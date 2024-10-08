import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const distroUSDC: () => void = () => {
  task("distroUSDC", "Distro USDC").setAction(async (taskArgs, hardhatRuntime) => {
    const signers = await hardhatRuntime.ethers.getSigners();
    const usdcAddress = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";
    const usdc = await hardhatRuntime.ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      usdcAddress
    );

    const usdcBalance = await usdc.balanceOf(signers[0].address);
    for (let i = 1; i < 10; i++) {
      console.log(`Signer ${i}: ${signers[i].address}`);
      await usdc.connect(signers[0]).transfer(signers[i].address, usdcBalance.div(10));
    }
  });
};
export { distroUSDC };

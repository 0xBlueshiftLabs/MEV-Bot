import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const getUSDC: () => void = () => {
  task("getUSDC", "Get USDC")
    .addParam("userIndex", "The user id to get the balance for")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[taskArgs.userIndex];
      console.log("Using the account:", caller.address);

      const whaleAddress = "0x466ead4273c8962a25711d8ff922e208606314d0"; // ~ 4M USDC
      const usdcAddress = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";

      const usdc = await hardhatRuntime.ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
        usdcAddress
      );
      const balance = await usdc.balanceOf(whaleAddress);
      console.log(`Balance of ${whaleAddress} for token ${usdcAddress} is ${balance.toString()}`);

      // impersonate whale and send usdc to caller
      await hardhatRuntime.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [whaleAddress],
      });
      const whale = await hardhatRuntime.ethers.getSigner(whaleAddress);
      await usdc.connect(whale).transfer(caller.address, balance);
      console.log(`Transferred ${balance.toString()} USDC to ${caller.address}`);
    });
};
export { getUSDC };

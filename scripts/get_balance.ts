import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task, types } from "hardhat/config";

const getBalance: () => void = () => {
  task("getBalance", "Get the balance of an account")
    .addParam("userIndex", "The user id to get the balance for")
    .addOptionalParam("address", "Token address (eth if not provided)", undefined, types.string)
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[taskArgs.userIndex];
      console.log("Using the account:", caller.address);

      if (taskArgs.address) {
        const token = await hardhatRuntime.ethers.getContractAt(
          "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
          taskArgs.address
        );
        const balance = await token.balanceOf(caller.address);
        console.log(`Balance of ${caller.address} for token ${taskArgs.address} is ${balance.toString()}`);
      } else {
        const balance = await hardhatRuntime.ethers.provider.getBalance(caller.address);
        console.log(`Balance of ${caller.address} is ${balance.toString()}`);
      }
    });
};
export { getBalance };

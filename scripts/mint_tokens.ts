import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const mintTokens: () => void = () => {
  task("mintTokens", "CP a user is holding")
    .addParam("amount", "amount of tokens to mint")
    .addParam("to", "To address")
    .addParam("token", "Token name: 'usdc' or 'arb' or 'eth'")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[0];
      console.log("Using the account:", caller.address);

      const usdcDeployment = await hardhatRuntime.deployments.get(`USDC`);
      const usdc = await hardhatRuntime.ethers.getContractAt("ERC20PresetMinterPauser", usdcDeployment.address);

      const arbDeployment = await hardhatRuntime.deployments.get(`Arbitrum`);
      const arb = await hardhatRuntime.ethers.getContractAt("ERC20PresetMinterPauser", arbDeployment.address);

      let token;
      let decimal = 18;
      if (taskArgs.token === "usdc") {
        token = usdc;
        decimal = await usdc.decimals();
      } else if (taskArgs.token === "arb") {
        token = arb;
        decimal = await arb.decimals();
      } else if (taskArgs.token === "eth") {
        token = hardhatRuntime.ethers.constants.AddressZero;
        decimal = 18;
      } else {
        throw new Error("Invalid token");
      }

      const amount = hardhatRuntime.ethers.utils.parseUnits(taskArgs.amount, decimal);

      await token.mint(taskArgs.to, amount);

      console.log("Tokens minted");

      console.log("USDC balance: ", (await usdc.balanceOf(caller.address)).toString());
      console.log("Arbitrum balance: ", (await arb.balanceOf(caller.address)).toString());
    });
};
export { mintTokens };

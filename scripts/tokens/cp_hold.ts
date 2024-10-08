import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const cpHold: () => void = () => {
  task("cpHold", "CP a user is holding")
    .addParam("userIndex", "User id")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[taskArgs.userIndex];
      console.log("Using the account:", caller.address);

      const cpDeployment = await hardhatRuntime.deployments.get(`CreditPosition`);
      const creditPosition = await hardhatRuntime.ethers.getContractAt("CreditPosition", cpDeployment.address);

      let totalSupply = await creditPosition.totalSupply();

      for (let i = 0; i < totalSupply; i++) {
        try {
          const owner = await creditPosition.ownerOf(i);
          if (owner === caller.address) {
            const positionType = await creditPosition.getPositionType(i);

            console.log(`Credit position ${i} is owned by ${owner} and is of type ${positionType}`);

            if (positionType === 0) {
              console.log(await creditPosition.getLiquidity(i));
            } else if (positionType === 1) {
              console.log(await creditPosition.getCredit(i));
            } else if (positionType === 2) {
              const result = await creditPosition.getDebt(i);
              const due = await hardhatRuntime.ethers.getContractAt("LockedDebt", result.assetContract);
              const debt = await due.dueOf(result.tokenId);
              console.log(debt);
            } else {
              console.log("Unknown position type");
            }
          }
        } catch (e) {
          console.log("Skipped position as it failed (probably already unwrapped", i);
          totalSupply++;
        }
      }
    });
};
export { cpHold };

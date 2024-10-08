import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const setRoute: () => void = () => {
  task("setRoute", "set the swap/flash route for a Credit pool")
    .addParam("pairFlashAddress", "Address of pair flash contract")
    .addParam("creditPairAddress", "Address of Credit pair")
    .addParam("flashPoolCounterTokenAddress", "Address of counter token for flash pool")
    .addParam("flashPoolFee", "Fee of flash pool")
    .addParam("swapPoolFee", "Fee of swap pool")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const pairFlash = await hardhatRuntime.ethers.getContractAt("PairFlash", taskArgs.pairFlashAddress);

      let routeDataParams = {
        flashPoolCounterToken: taskArgs.flashPoolCounterTokenAddress,
        flashPoolFee: taskArgs.flashPoolFee,
        swapPoolFee: taskArgs.swapPoolFee,
      };

      await pairFlash.setRoute(taskArgs.creditPairAddress, routeDataParams);

      console.log("Route set");
    });
};
export { setRoute };

// PairFlash 0x33c9dE8660EA853aD76749793Bd60Ea26fD0698b

import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const advanceTime: () => void = () => {
  task("advanceTime", "advance time")
    .addParam("time", "time to advance in seconds")
    .setAction(async (taskArgs, hardhatRuntime) => {
      await hardhatRuntime.ethers.provider.send("evm_increaseTime", [parseInt(taskArgs.time)]);
      await hardhatRuntime.ethers.provider.send("evm_mine", []);

      const currentBlock = await hardhatRuntime.ethers.provider.getBlock("latest");
      console.log("Time advanced by", taskArgs.time, "seconds");
      console.log("Current block", currentBlock.number);
      console.log("Current timestamp", currentBlock.timestamp);
      console.log("Current time", convertToDate(currentBlock.timestamp));
    });
};

const convertToDate = (timestamp: number) => new Date(timestamp * 1000).toUTCString();

export { advanceTime };

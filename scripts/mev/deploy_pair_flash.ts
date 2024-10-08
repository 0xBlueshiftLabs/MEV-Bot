import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const deployPairFlash: () => void = () => {
  task("deployPairFlash", "Deploys PairFlash contract").setAction(async (taskArgs, hardhatRuntime) => {
    const [caller] = await hardhatRuntime.ethers.getSigners();
    console.log("Using the account:", caller.address);

    const CreditRouterDeployment = await hardhatRuntime.deployments.get("Router");
    const creditRouter = await hardhatRuntime.ethers.getContractAt("CreditRouter", CreditRouterDeployment.address);

    const DexRouter = await hardhatRuntime.deployments.get("DexRouter");
    const dexRouter = await hardhatRuntime.ethers.getContractAt(DexRouter.abi, DexRouter.address);

    const DexFactory = await hardhatRuntime.deployments.get("DexFactory");
    const dexFactory = await hardhatRuntime.ethers.getContractAt(DexFactory.abi, DexFactory.address);

    const wethAddress = (await hardhatRuntime.deployments.get("WETH")).address;

    const PairFlash = await hardhatRuntime.ethers.getContractFactory("PairFlash");
    const pairFlash = await PairFlash.deploy(
      creditRouter.address,
      dexRouter.address,
      dexFactory.address,
      wethAddress,
      caller.address, // admin
      caller.address // recipient
    );
    await pairFlash.deployed();

    hardhatRuntime.deployments.save(`PairFlash`, { abi: [], address: pairFlash.address });

    console.log("PairFlash contract deployed at:", pairFlash.address);
  });
};
export { deployPairFlash };

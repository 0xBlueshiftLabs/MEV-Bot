import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  let wethAddress: string;
  if ((await hre.getChainId()) === "421613") {
    const weth = await deploy("WETH9", {
      from: deployer,
      log: true,
    });

    wethAddress = weth.address;
    console.log("Weth contract deployed for hardhat: ", wethAddress);
  } else if ((await hre.getChainId()) === "42161" || (await hre.getChainId()) === "31337") {
    console.log("Using Arbitrum WETH address");
    wethAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  } else {
    throw new Error("Unknown network");
  }

  deployments.save("WETH", { abi: [], address: wethAddress });
};

export default func;
func.tags = ["WETH"];

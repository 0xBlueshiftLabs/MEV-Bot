import { HardhatRuntimeEnvironment } from "hardhat/types";

import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  /*///////////////////////////////////////////////////////////////
                            Deploy Receipt tokens
  //////////////////////////////////////////////////////////////*/

  await deploy("DeployLiquidity", {
    from: deployer,
    log: true,
  });

  await deploy("DeployLoans", {
    from: deployer,
    log: true,
  });

  await deploy("DeployCoverages", {
    from: deployer,
    log: true,
  });

  await deploy("DeployLockedDebt", {
    from: deployer,
    log: true,
  });
};

export default func;
func.tags = ["ReceiptTokens"];
func.dependencies = ["Core"];

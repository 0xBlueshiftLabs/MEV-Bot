import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Address } from "hardhat-deploy/types";

import { BigNumberish } from "ethers";
import type { CreditFactory as Factory } from "../../../typechain/CreditFactory";
import constants from "./Constants";

let signers: SignerWithAddress[];
(async () => {
  signers = await ethers.getSigners();
})();

export async function factoryInit(
  pairCreator: Address = signers[10].address,
  protocolFeeCollector: Address = signers[10].address,
  stakingFeeCollector: Address = signers[10].address,
  beaconAddress: Address,
  fee: BigNumberish = constants.FEE,
  protocolFee: BigNumberish = constants.PROTOCOL_FEE,
  stakingFee: BigNumberish = constants.STAKING_FEE
): Promise<Factory> {
  const factoryContractFactory = await ethers.getContractFactory("CreditFactory");
  const factory = (await factoryContractFactory.deploy()) as Factory;
  await factory.deployed();
  await factory.initialize(
    pairCreator,
    protocolFeeCollector,
    stakingFeeCollector,
    beaconAddress,
    fee,
    protocolFee,
    stakingFee
  );
  return factory;
}

export default { factoryInit };

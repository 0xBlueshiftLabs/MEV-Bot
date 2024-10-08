import { BigNumber, BigNumberish } from "ethers";
import { Interface, LogDescription } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { TestToken } from "../../typechain";

export const testTokenNew = async (name: string, symbol: string, value: BigNumberish): Promise<TestToken> => {
  const testTokenFactory = await ethers.getContractFactory("TestToken");
  const testToken = (await testTokenFactory.deploy(name, symbol, value)) as TestToken;
  await testToken.deployed();

  return testToken;
};

export async function now(): Promise<BigNumber> {
  const block = await getBlock("latest");
  return BigNumber.from(block.timestamp);
}

export async function getBlock(blockHashOrBlockTag: string) {
  const block = await ethers.provider.getBlock(blockHashOrBlockTag);
  return block;
}

export async function setTime(time: BigNumber): Promise<void> {
  await ethers.provider.send("evm_setNextBlockTimestamp", [time.toNumber()]);
  await ethers.provider.send("evm_mine", []);
}

export async function advanceTime(time: BigNumber): Promise<void> {
  await ethers.provider.send("evm_increaseTime", [time.toNumber()]);
  await ethers.provider.send("evm_mine", []);
}

export function getEvent(_interface: Interface, receipt: any, eventName: string) {
  const events = receipt.logs.reduce((result: LogDescription[], log) => {
    try {
      result.push(_interface.parseLog(log));
    } catch (e) {}

    return result;
  }, []);

  return events.filter((x: LogDescription) => {
    return x.name == eventName;
  });
}

export function min(x: BigNumber, y: BigNumber): BigNumber {
  if (x <= y) {
    return x;
  } else {
    return y;
  }
}

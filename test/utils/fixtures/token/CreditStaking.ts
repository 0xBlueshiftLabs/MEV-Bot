import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { CreditStaking, CreditToken, TestToken, WETH9 } from "../../../../typechain";
import { now, testTokenNew } from "../../helper";

export interface CreditStakingContext {
  creditStaking: CreditStaking;
  tknToken: TestToken;
  weth: WETH9;
  creditToken: CreditToken;
  startTime: BigNumber;
  treasury: string;
  unstakingPenalties: number[];
}

export const deploy = async (startTime: BigNumber): Promise<CreditStakingContext> => {
  const CreditToken = await ethers.getContractFactory("CreditToken");
  const creditToken = (await CreditToken.deploy()) as CreditToken;
  await creditToken.initialize("Credit", "CREDIT");
  await creditToken.mint((await ethers.getSigners())[0].address, ethers.utils.parseEther("450000"));

  const tknToken = (await testTokenNew("USDC", "USDC", BigNumber.from("1000000000000000000000000000"))) as TestToken;

  const WETH = await ethers.getContractFactory("WETH9");
  const weth = (await WETH.deploy()) as WETH9;

  const unstakingPenalties = [0, 2500, 5000, 7500];
  const epochDuration = 2629743; // 30 days
  const treasury = await ethers.Wallet.createRandom().getAddress();

  const CreditStaking = await ethers.getContractFactory("CreditStaking");
  const creditStaking = (await CreditStaking.deploy()) as CreditStaking;

  await creditStaking.initialize(
    creditToken.address,
    startTime,
    epochDuration,
    unstakingPenalties,
    treasury,
    weth.address
  );

  // enable distributed token
  await creditStaking.enableDistributedToken(creditToken.address);
  await creditStaking.enableDistributedToken(tknToken.address);
  await creditStaking.enableDistributedToken(weth.address);

  return {
    creditStaking,
    tknToken,
    weth,
    creditToken,
    startTime,
    treasury,
    unstakingPenalties,
  };
};

export async function unstakingPenalty(context: CreditStakingContext): Promise<number> {
  const currentBlockTime = await now();

  const currentCycleStartTime = await context.creditStaking.currentCycleStartTime();

  if (currentBlockTime.gte(currentCycleStartTime.add(BigNumber.from(1814400)))) {
    return context.unstakingPenalties[0];
  } else if (currentBlockTime.gte(currentCycleStartTime.add(BigNumber.from(1209600)))) {
    return context.unstakingPenalties[1];
  } else if (currentBlockTime.gte(currentCycleStartTime.add(BigNumber.from(604800)))) {
    return context.unstakingPenalties[2];
  }
  return context.unstakingPenalties[3];
}

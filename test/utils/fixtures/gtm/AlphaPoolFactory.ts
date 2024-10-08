import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import {
  AlphaPoolFactory,
  CreditStaking,
  CreditToken,
  MockCreditStaking,
  TestToken,
  UpgradeableBeacon,
  WETH9,
} from "../../../../typechain";
import { testTokenNew } from "../../helper";
import { deploy as deployCreditStaking } from "../token/CreditStaking";

interface AlphaPoolFactoryContext {
  alphaPoolFactory: AlphaPoolFactory;
  creditStaking: CreditStaking | MockCreditStaking;
  creditToken: CreditToken;
  tknToken: TestToken;
  usdcToken: TestToken;
  arbToken: TestToken;
  gmxToken: TestToken;
  wethToken: WETH9;
}
export const deploy = async (
  depositStart: BigNumber,
  loanStart: BigNumber,
  stakingStart: BigNumber,
  treasury: string,
  owner: string,
  mockedStaking: boolean = false
): Promise<AlphaPoolFactoryContext> => {
  const beacon = await deployBeacon();

  const AlphaPoolFactoryFactory = await ethers.getContractFactory("AlphaPoolFactory");
  const alphaPoolFactory = (await AlphaPoolFactoryFactory.deploy()) as AlphaPoolFactory;

  const usdcToken = await testTokenNew("USDC", "USDC", BigNumber.from("1000000000000000000000000000"));
  const arbToken = await testTokenNew("ARB", "ARB", BigNumber.from("1000000000000000000000000000"));
  const gmxToken = await testTokenNew("GMX", "GMX", BigNumber.from("1000000000000000000000000000"));

  let creditStaking: CreditStaking | MockCreditStaking;
  let creditToken: CreditToken;
  let tknToken: TestToken;
  let weth: WETH9;

  if (mockedStaking) {
    const CreditToken = await ethers.getContractFactory("CreditToken");
    creditToken = (await CreditToken.deploy()) as CreditToken;
    await creditToken.initialize("Credit", "CREDIT");
    await creditToken.mint(owner, ethers.utils.parseEther("450000"));

    const WETH = await ethers.getContractFactory("WETH9");
    weth = (await WETH.deploy()) as WETH9;

    tknToken = await testTokenNew("TKN", "TKN", BigNumber.from("1000000000000000000000000000"));

    creditStaking = await deployMockedCreditStaking(treasury, creditToken.address, weth.address, tknToken.address);
  } else {
    const creditStakingContext = await deployCreditStaking(stakingStart);
    creditStaking = creditStakingContext.creditStaking;
    creditToken = creditStakingContext.creditToken;
    tknToken = creditStakingContext.tknToken;
    weth = creditStakingContext.weth;
  }

  // fund the weth contract with some eth (required for weth withdraw)
  await weth.deposit({ value: ethers.utils.parseEther("1000000") });

  await alphaPoolFactory.initialize(depositStart, loanStart, beacon.address, treasury, owner, weth.address);

  await alphaPoolFactory.setCreditStaking(creditStaking.address);
  await alphaPoolFactory.setCreditToken(creditToken.address);

  return {
    alphaPoolFactory,
    creditStaking,
    creditToken,
    tknToken,
    usdcToken,
    arbToken,
    gmxToken,
    wethToken: weth,
  };
};

const deployMockedCreditStaking = async (
  treasury: string,
  credit: string,
  weth: string,
  token: string
): Promise<MockCreditStaking> => {
  const MockedStakingFactory = await ethers.getContractFactory("MockCreditStaking");
  return (await MockedStakingFactory.deploy(treasury, credit, weth, token)) as MockCreditStaking;
};

const deployBeacon = async (): Promise<UpgradeableBeacon> => {
  const AlphaPoolFactory = await ethers.getContractFactory("AlphaPool");
  const upgradeableBeaconFactory = await ethers.getContractFactory("UpgradeableBeacon");

  const AlphaPool = await AlphaPoolFactory.deploy();

  const upgradeableBeacon = (await upgradeableBeaconFactory.deploy(AlphaPool.address)) as UpgradeableBeacon;

  return upgradeableBeacon;
};

export const deployAlphaPool = async (
  context: AlphaPoolFactoryContext,
  tokenA: string,
  tokenB: string,
  maturity: BigNumber,
  allocationPoint: BigNumber
) => {
  const tokensToDistributeBasis = [context.creditToken.address, context.wethToken.address, context.tknToken.address];
  await context.alphaPoolFactory.createAlphaPool(tokenA, tokenB, maturity, allocationPoint, [
    ...tokensToDistributeBasis,
    tokenA,
  ]);
};

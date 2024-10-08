import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { AlphaPool, CreditToken, TestToken, WETH9 } from "../../../../typechain";
import { testTokenNew } from "../../helper";

interface AlphaPoolContext {
  alphaPool: AlphaPool;
  tokenA: TestToken;
  tokenB: TestToken | WETH9;
  creditToken: CreditToken;
  tknToken: TestToken;
  wethToken: WETH9;
}
export const deploy = async (
  maturity: BigNumber,
  depositStart: BigNumber,
  loanStart: BigNumber,
  owner: string
): Promise<AlphaPoolContext> => {
  const usdcToken = await testTokenNew("USDC", "USDC", BigNumber.from("1000000000000000000000000000"));
  const WETH = await ethers.getContractFactory("WETH9");
  const weth = (await WETH.deploy()) as WETH9;
  const tknToken = await testTokenNew("TKN", "TKN", BigNumber.from("1000000000000000000000000000"));
  const CreditToken = await ethers.getContractFactory("CreditToken");
  const creditToken = (await CreditToken.deploy()) as CreditToken;
  await creditToken.initialize("Credit", "CREDIT");
  await creditToken.mint(owner, ethers.utils.parseEther("450000"));

  const AlphaPool = await ethers.getContractFactory("AlphaPool");
  const alphaPool = (await AlphaPool.deploy()) as AlphaPool;

  const tokensToDistribute = [creditToken.address, weth.address, tknToken.address, usdcToken.address];

  await alphaPool.initialize(
    usdcToken.address,
    weth.address,
    weth.address,
    maturity,
    depositStart,
    loanStart,
    tokensToDistribute,
    owner
  );

  // fund the weth contract with some eth (required for weth withdraw)
  await weth.deposit({ value: ethers.utils.parseEther("100000") });

  return {
    alphaPool,
    tokenA: usdcToken,
    tokenB: weth,
    creditToken,
    tknToken,
    wethToken: weth,
  };
};

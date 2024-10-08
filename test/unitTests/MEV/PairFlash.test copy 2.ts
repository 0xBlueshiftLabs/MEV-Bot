import { expect } from "chai";
import { BigNumber } from "ethers";
import * as fs from "fs";
import { ethers, network, waffle } from "hardhat";
import path from "path";
import { borrowGivenPercent } from "../../utils/fixtures/Borrow";
import {
  DeploymentContextForExistingTokens,
  createDeploymentContextFixtureForDeployedTokens,
} from "../../utils/fixtures/DeployForExistingTokens";
import { newLiquidity } from "../../utils/fixtures/LiquidityForExistingTokens";
import { now } from "../../utils/helper";
import { getBorrowState } from "../../utils/stateForExistingTokens";
import { getAssetOut } from "./helpers/AssetOutSearcher";
import { givenPercent } from "./helpers/BorrowMath";
import { calculateCdp } from "./helpers/CDP";
import { borrow } from "./helpers/CreditMath";
import { CP } from "./helpers/types/credit";

const { loadFixture } = waffle;

// token addresses on Eth main net
const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const daiAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const uniAddress = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

const whaleAddress = "0x748dE14197922c4Ae258c7939C7739f3ff1db573"; // random address with balances of above tokens

const uniswapV2Factory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const uniswapV2Router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

let percentMidpoint = BigNumber.from(2 ** 31);

let pairFlash;
let dai, usdc, weth, uni;
let maturity;
let poolState;
let context;
let creditRouterAddress;
let whale;

let signers = [];

const newLiquidityParams = {
  assetIn: ethers.utils.parseEther("500"),
  debtIn: ethers.utils.parseEther("600"),
  collateralIn: BigNumber.from(1000e6),
};

async function fixture(): Promise<DeploymentContextForExistingTokens> {
  return await createDeploymentContextFixtureForDeployedTokens(
    signers[0], // deployer
    signers[9].address, // dummy distributor address
    uniAddress, // asset address
    usdcAddress // collateral address
  );
}

describe("Undercollateralization Arbitrage", function () {
  before(async () => {
    signers = await ethers.getSigners();

    // impersonate account
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [whaleAddress],
    });
    whale = await ethers.getSigner(whaleAddress);

    usdc = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", usdcAddress);
    dai = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", daiAddress);
    weth = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", wethAddress);
    uni = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", uniAddress);

    await uni.connect(whale).transfer(signers[0].address, ethers.utils.parseEther("500"));
    await usdc.connect(whale).transfer(signers[0].address, 1000e6);
    expect(await uni.balanceOf(signers[0].address)).to.equal(ethers.utils.parseEther("500"));
    expect(await usdc.balanceOf(signers[0].address)).to.equal(1000e6);

    // creating Credit pool

    context = await loadFixture(fixture);
    creditRouterAddress = await context.router.address;

    maturity = (await now()).add(7 * 24 * 60 * 60); // 7d

    await context.assetToken.approve(context.router.address, newLiquidityParams.assetIn);
    await context.collateralToken.approve(context.router.address, newLiquidityParams.collateralIn);

    await newLiquidity(context, maturity, newLiquidityParams, signers[0]);

    poolState = await getBorrowState(context, maturity, signers[0], false, false);

    console.log("Pool CDP: %s", await getCDP(maturity));

    // deploying MEV contract
    const PairFlash = await ethers.getContractFactory("PairFlash");
    pairFlash = await PairFlash.deploy(
      creditRouterAddress,
      uniswapV2Router,
      uniswapV2Factory,
      wethAddress,
      signers[2].address, // admin
      signers[3].address // recipient
    );
    await pairFlash.deployed();
  });

  it("Variables initialized", async () => {
    expect(await pairFlash.creditRouter()).to.equal(creditRouterAddress);
    expect(await pairFlash.uniswapV2Router()).to.equal(uniswapV2Router);
    expect(await pairFlash.uniswapV2Factory()).to.equal(uniswapV2Factory);

    expect(await pairFlash.weth()).to.equal(wethAddress);
    expect(await pairFlash.admin()).to.equal(signers[2].address);
    expect(await pairFlash.recipient()).to.equal(signers[3].address);
  });

  it("Only owner can set admin & recipient", async () => {
    await expect(pairFlash.connect(signers[1]).setAdmin(signers[1].address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await expect(pairFlash.connect(signers[1]).setRecipient(signers[1].address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    await pairFlash.setAdmin(signers[1].address);
    expect(await pairFlash.admin()).to.equal(signers[1].address);

    await pairFlash.setRecipient(signers[2].address);
    expect(await pairFlash.recipient()).to.equal(signers[2].address);
  });

  // it("setRoute reverts if not a valid pool", async () => {
  //   await expect(
  //     pairFlash.setRoute(poolState.pairContract.address, {
  //       flashPoolCounterToken: daiAddress, // tokenA already USDT
  //       flashPoolFee: 500,
  //       swapPoolFee: 3000,
  //     })
  //   ).to.be.revertedWith("Flash pool does not exist");

  //   await expect(
  //     pairFlash.setRoute(poolState.pairContract.address, {
  //       flashPoolCounterToken: usdcAddress,
  //       flashPoolFee: 500,
  //       swapPoolFee: 1000, // fee does not exist
  //     })
  //   ).to.be.revertedWith("Swap pool does not exist");
  // });

  // it("Reverts if pair not initialized", async () => {
  //   let executeParams = await getExecutionParams(100, maturity, percentMidpoint);

  //   // reverts if pair not initialized
  //   await expect(pairFlash.execute(executeParams)).to.be.revertedWith("Pair not initialized");

  //   // initializing pair
  //   let routeDataParams = {
  //     flashPoolCounterToken: usdcAddress,
  //     flashPoolFee: 500,
  //     swapPoolFee: 3000,
  //   };

  //   await pairFlash.setRoute(poolState.pairContract.address, routeDataParams);

  //   let routeDataReturn = await pairFlash.route(poolState.pairContract.address);

  //   expect(routeDataReturn[0]).to.equal(routeDataParams.flashPoolCounterToken);
  //   expect(routeDataReturn[1]).to.equal(routeDataParams.flashPoolFee);
  //   expect(routeDataReturn[2]).to.equal(routeDataParams.swapPoolFee);
  // });

  it("Reverts if state has changed before tx mined", async () => {
    let executeParams = await getExecutionParams(100, maturity, percentMidpoint);

    // Changing pool state by borrowing

    const borrowGivenPercentParams = {
      assetOut: ethers.utils.parseEther("100"),
      percent: BigNumber.from(1).shl(31), // 50% (2^31)
      maxDebt: ethers.utils.parseEther("150"),
      maxCollateral: ethers.utils.parseEther("200"),
    };

    await context.assetToken.connect(whale).approve(context.router.address, borrowGivenPercentParams.assetOut);
    await context.collateralToken
      .connect(whale)
      .approve(context.router.address, borrowGivenPercentParams.maxCollateral);

    await borrowGivenPercent(context, maturity, borrowGivenPercentParams, whale);

    // attempting to execute arbitrage with an old pool state
    await expect(pairFlash.execute(executeParams)).to.be.revertedWith("Pool state has changed");
  });

  it("Flash swap", async () => {
    let targetCDP = 100;
    let executeParams = await getExecutionParams(targetCDP, maturity, percentMidpoint);

    let recipientBalanceBefore = await usdc.balanceOf(signers[2].address);
    expect(await usdc.balanceOf(signers[2].address)).to.equal(0);

    await pairFlash.execute(executeParams);

    expect(await getCDP(maturity)).to.equal(targetCDP);

    console.log(await usdc.balanceOf(signers[2].address));

    // balance of recipient should have increased
    expect(await usdc.balanceOf(signers[2].address)).to.be.gt(recipientBalanceBefore);
  });

  it("Reverts if not profitable", async () => {
    // pool CDP currently 100% therefore not profitable to execute (asset amount borrowed <= collateral deposited)

    let targetCDP = 120;

    let executeParams = await getExecutionParams(targetCDP, maturity, percentMidpoint);

    await expect(pairFlash.execute(executeParams)).to.be.revertedWith("UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT");
  });
});

async function getExecutionParams(targetCDP, maturity, percent) {
  let lpFee = await poolState.pairContract.lpFee();
  let protocolFee = await poolState.pairContract.protocolFee();
  let stakingFee = await poolState.pairContract.stakingFee();

  let constantProduct = await poolState.pairContract.constantProduct(maturity);

  let state: CP = { x: constantProduct[0], y: constantProduct[1], z: constantProduct[2] };

  //let currentTimestamp = await now();

  const currentBlock = await ethers.provider.getBlock("latest");

  // getting uniV2Router instance
  // const dir = path.resolve(__dirname, "./UniV2Router.json");
  // const file = fs.readFileSync(dir, "utf8");
  // const json = JSON.parse(file);
  // const abi = json.abi;
  // const uniV2Router = await ethers.getContractAt(abi, uniswapV2Router);

  let assetDecimals = await uni.decimals();
  let collateralDecimals = await usdc.decimals();

  let assetPrice = await getTokenPrice(uniAddress, assetDecimals);
  let collateralPrice = await getTokenPrice(usdcAddress, collateralDecimals);

  let currentCDP = calculateCdp(
    state.x,
    state.z,
    assetPrice,
    collateralPrice,
    assetDecimals,
    collateralDecimals
  ).toNumber();

  console.log("CDP: %s", currentCDP);
  console.log();

  let assetOut = await getAssetOut(
    targetCDP, // %
    1, // margin %
    assetDecimals,
    collateralDecimals,
    assetPrice,
    collateralPrice,
    ethers.utils.parseEther("0.01"), // increment - 0.01 ARB = $0.01 ish
    maturity,
    lpFee,
    protocolFee,
    stakingFee,
    state,
    percent,
    BigNumber.from(currentBlock.timestamp)
  );

  //if (assetOut == -1) throw new Error("Asset out solution not found");

  let deltaState = givenPercent(
    lpFee,
    protocolFee,
    stakingFee,
    state,
    maturity,
    assetOut,
    percent,
    BigNumber.from(currentBlock.timestamp)
  );

  let borrowReturn = borrow(
    maturity,
    state,
    deltaState.xDecrease,
    deltaState.yIncrease,
    deltaState.zIncrease,
    lpFee,
    protocolFee,
    stakingFee,
    BigNumber.from(currentBlock.timestamp)
  );

  const executeParams = {
    creditPair: poolState.pairContract.address,
    maturity: maturity,
    assetOut: assetOut,
    maxDebt: borrowReturn.dueOut.debt,
    maxCollateral: borrowReturn.dueOut.collateral,
    x: state.x,
    y: state.y,
    z: state.z,
  };

  return executeParams;
}

async function getCDP(maturity) {
  let constantProduct = await poolState.pairContract.constantProduct(maturity);

  let state: CP = { x: constantProduct[0], y: constantProduct[1], z: constantProduct[2] };

  let assetDecimals = await uni.decimals();
  let collateralDecimals = await usdc.decimals();

  let assetPrice = await getTokenPrice(uniAddress, assetDecimals);
  let collateralPrice = await getTokenPrice(usdcAddress, collateralDecimals);

  return calculateCdp(state.x, state.z, assetPrice, collateralPrice, assetDecimals, collateralDecimals);
}

async function getTokenPrice(tokenAddress, decimals) {
  // getting uniV2Router instance
  const dir = path.resolve(__dirname, "./UniV2Router.json");
  const file = fs.readFileSync(dir, "utf8");
  const json = JSON.parse(file);
  const abi = json.abi;
  const uniV2Router = await ethers.getContractAt(abi, uniswapV2Router);

  let price = (
    await uniV2Router.getAmountsOut(BigNumber.from(1).mul((10 ** decimals).toString()), [tokenAddress, wethAddress])
  )[1];

  return price;
}

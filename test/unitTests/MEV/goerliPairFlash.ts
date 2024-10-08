import { expect } from "chai";
import { BigNumber } from "ethers";
import * as fs from "fs";
import { ethers } from "hardhat";
import path from "path";
import { getAssetOut } from "./helpers/AssetOutSearcher";
import { givenPercent } from "./helpers/BorrowMath";
import { calculateCdp } from "./helpers/CDP";
import { borrow } from "./helpers/CreditMath";
import { CP } from "./helpers/types/credit";

// token addresses on Arb goerli
const usdcAddress = "0x96244E2ae03B8edA8c1035F75948667777D3ac52";
const wethAddress = "0xEe01c0CD76354C383B8c7B4e65EA88D00B06f36f";
const arbAddress = "0x2C085310719Bf846A135ff80c059aaBc96320A49";

const uniswapV2Factory = "0x895E1ecf319952437fB6C239aE4AFD602a7F9EAA";
const uniswapV2Router = "0x08a5cB0085BCCe4E14A4c5B670b3710ACc7B371e";

let creditRouterAddress = "0x635519Eb4d1113305e1c1D5d06ce9e08E8eE9aD0";

let creditPairAddress = "0x4062CB57A472724237f169F226F9dF0DE58e24DF";

let percentMidpoint = BigNumber.from(2 ** 31);

let pairFlash;
let arb, usdc, weth;
let maturity = BigNumber.from(1700521548);
let poolState;

let creditPair;

let signers = [];

describe("Undercollateralization Arbitrage", function () {
  before(async () => {
    signers = await ethers.getSigners();

    usdc = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", usdcAddress);
    arb = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", arbAddress);
    weth = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", wethAddress);

    creditPair = await ethers.getContractAt("CreditPair", creditPairAddress);

    let constantProduct = await creditPair.constantProduct(maturity);

    poolState = { x: constantProduct[0], y: constantProduct[1], z: constantProduct[2] };

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
});

async function getExecutionParams(targetCDP, maturity, percent) {
  let lpFee = await creditPair.lpFee();
  let protocolFee = await creditPair.protocolFee();
  let stakingFee = await creditPair.stakingFee();

  let constantProduct = await creditPair.constantProduct(maturity);

  let state: CP = { x: constantProduct[0], y: constantProduct[1], z: constantProduct[2] };

  const currentBlock = await ethers.provider.getBlock("latest");

  let assetDecimals = await arb.decimals();
  let collateralDecimals = await usdc.decimals();

  let assetPrice = await getTokenPrice(arbAddress, assetDecimals);
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
    creditPair: creditPairAddress,
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
  let constantProduct = await creditPair.constantProduct(maturity);

  let state: CP = { x: constantProduct[0], y: constantProduct[1], z: constantProduct[2] };

  console.log(state);

  let assetDecimals = await arb.decimals();
  let collateralDecimals = await usdc.decimals();

  console.log("Asset decimals: %s", assetDecimals);
  console.log("Collateral decimals: %s", collateralDecimals);

  let assetPrice = await getTokenPrice(arbAddress, assetDecimals);
  let collateralPrice = await getTokenPrice(usdcAddress, collateralDecimals);

  console.log("Asset price: %s", assetPrice);
  console.log("Collateral price: %s", collateralPrice);

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

import "@nomiclabs/hardhat-ethers";
import { BigNumber } from "ethers";
import * as fs from "fs";
import "hardhat-deploy";
import { task } from "hardhat/config";
import path from "path";
import { calculateCdp } from "../../test/unitTests/MEV/helpers/CDP";
import { CP } from "../../test/unitTests/MEV/helpers/types/credit";
/*
import { getAssetOut } from "../../test/unitTests/MEV/helpers/AssetOutSearcher";
import { givenPercent } from "../../test/unitTests/MEV/helpers/BorrowMath";
import { borrow } from "../../test/unitTests/MEV/helpers/CreditMath";
*/

const executeArbitrage: () => void = () => {
  task("executeArbitrage", "Execute an arbitrage opportunity").setAction(async (taskArgs, hardhatRuntime) => {
    const percent = BigNumber.from(1).shl(31);

    const usdcAddress = "0xf32591AcCB308f691f7D3efc93EF98c48C5F4a62";
    const wethAddress = "0xF5c6100Fa77971b2B531c752eA82874Df8bAB44A";

    const uniV2RouterAddress = "0x67318a4795D50FB902312f2184951b3a2517968a";

    const dir = path.resolve(__dirname, "./UniV2Router.json");
    const file = fs.readFileSync(dir, "utf8");
    const json = JSON.parse(file);
    const abi = json.abi;

    const uniV2Router = await hardhatRuntime.ethers.getContractAt(abi, uniV2RouterAddress);

    const pairFlash = await hardhatRuntime.ethers.getContractAt(
      "PairFlash",
      "0x33c9dE8660EA853aD76749793Bd60Ea26fD0698b"
    );

    const creditPair = await hardhatRuntime.ethers.getContractAt(
      "CreditPair",
      "0xb9a397E2195a344B18633B40A24822bB775d8c33"
    );

    const assetTokenAddress = await creditPair.asset();
    const collateralTokenAddress = await creditPair.collateral();

    const assetToken = await hardhatRuntime.ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      assetTokenAddress
    );
    const collateralToken = await hardhatRuntime.ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      collateralTokenAddress
    );

    let maturity = 1696699615;

    let targetCDP = 100;

    let lpFee = await creditPair.lpFee();
    let protocolFee = await creditPair.protocolFee();
    let stakingFee = await creditPair.stakingFee();

    let constantProduct = await creditPair.constantProduct(maturity);

    let state: CP = { x: constantProduct[0], y: constantProduct[1], z: constantProduct[2] };

    let assetPrice = (
      await uniV2Router.getAmountsOut(hardhatRuntime.ethers.utils.parseEther("0.0001"), [
        assetTokenAddress,
        wethAddress,
      ])
    )[1];
    let collateralPrice = (
      await uniV2Router.getAmountsOut(hardhatRuntime.ethers.utils.parseEther("0.0001"), [
        collateralTokenAddress,
        wethAddress,
      ])
    )[1];

    console.log();
    console.log("USDC/WETH price: ", assetPrice.toString());
    console.log("ARB/WETH price: ", collateralPrice.toString());
    console.log();

    let assetDecimals = await assetToken.decimals();
    let collateralDecimals = await collateralToken.decimals();

    let currentCDP = calculateCdp(state.x, state.z, assetPrice, collateralPrice, assetDecimals, collateralDecimals);

    //if (currentCDP.toNumber() >= 100) throw new Error("Pool is not undercollateralized");

    console.log("CDP: %s", currentCDP);
    console.log();

    /*

    // getting timestamp
    const blockNumBefore = await hardhatRuntime.ethers.provider.getBlockNumber();
    const blockBefore = await hardhatRuntime.ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;

    let assetOut = getAssetOut(
      targetCDP, // %
      0.1, // margin %
      assetDecimals,
      collateralDecimals,
      assetPrice,
      collateralPrice,
      hardhatRuntime.ethers.utils.parseEther("0.01"), // increment - 0.01 ARB = $0.01 ish
      maturity,
      lpFee,
      protocolFee,
      stakingFee,
      state,
      percent,
      currentTimestamp
    );

    if (assetOut == -1) throw new Error("Asset out solution not found");

    let deltaState = givenPercent(lpFee, protocolFee, stakingFee, state, maturity, assetOut, percent, currentTimestamp);

    let borrowReturn = borrow(
      maturity,
      state,
      deltaState.xDecrease,
      deltaState.yIncrease,
      deltaState.zIncrease,
      lpFee,
      protocolFee,
      stakingFee,
      currentTimestamp
    );

    const executeParams = {
      creditPair: creditPair.address,
      maturity: maturity,
      assetOut: assetOut,
      maxDebt: borrowReturn.dueOut.debt,
      maxCollateral: borrowReturn.dueOut.collateral,
      x: state.x,
      y: state.y,
      z: state.z,
    };

    await pairFlash.executeArbitrage(executeParams);
    */
  });
};
export { executeArbitrage };

// PairFlash 0x33c9dE8660EA853aD76749793Bd60Ea26fD0698b

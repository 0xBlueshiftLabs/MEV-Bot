import "@nomiclabs/hardhat-ethers";
import { BigNumber } from "ethers";
import * as fs from "fs";
import "hardhat-deploy";
import { task } from "hardhat/config";
import path from "path";
import { getAssetOut } from "../../test/unitTests/MEV/helpers/AssetOutSearcher";
import { givenPercent } from "../../test/unitTests/MEV/helpers/BorrowMath";
import { calculateCdp } from "../../test/unitTests/MEV/helpers/CDP";
import { borrow } from "../../test/unitTests/MEV/helpers/CreditMath";
import { CP } from "../../test/unitTests/MEV/helpers/types/credit";

const executeArbitrage: () => void = () => {
  task("executeArbitrage", "Execute an arbitrage opportunity")
    .addParam("creditpairaddress", "Address of Credit pair to arbitrage")
    .addParam("maturity", "Maturity timestamp of Credit pool to arbitrage")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const merkleProof = [
        "0x00cbb41426b5b536f0347fee03df24eba186a5a61f4ef88d625bd87ab2fa0dc8",
        "0xfc9c7d5bd92f213fc2169099f29ff58c084bd786c11f10d428f0453a434fba65",
        "0xfa2948f4901ef7d743eef358e1aaf51b4436a8a6507f652d2273f5dfe2f03a44",
        "0xae52be959b737b4d1f521674060997c7ec13ec9a2dfa56c1c0ff230db7ddad3b",
        "0xc4fa8acb7000be89a70e8e800e2e588b7c9a269fba5084b339ffed9ff8dd860c",
        "0xba9d11803e65939f879a7b34b5c68c93d162f629881d952b23cbc9cd2a28210f",
        "0x651fac90ba1354ac43e7596cbd54b216d0094a35b457055ae1fc554564932e53",
      ]; // proof is specific to deployment (ArbGoerli) of PairFlash contract at address: 0x8A4a6348083e9488eA354F8aA2AED5Ad6027d68b

      // getting Uniswap Router abi
      const dir = path.resolve(__dirname, "./UniswapV2Router.json");
      const file = fs.readFileSync(dir, "utf8");
      const json = JSON.parse(file);
      const abi = json.abi;

      const DexRouter = await hardhatRuntime.deployments.get("DexRouter");
      const dexRouter = await hardhatRuntime.ethers.getContractAt(abi, DexRouter.address);

      const PairFlash = await hardhatRuntime.deployments.get("PairFlash");
      const pairFlash = await hardhatRuntime.ethers.getContractAt("PairFlash", PairFlash.address);

      const wethAddress = (await hardhatRuntime.deployments.get("WETH")).address;

      const creditPair = await hardhatRuntime.ethers.getContractAt("CreditPair", taskArgs.creditpairaddress);

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

      let assetDecimals = await assetToken.decimals();
      let collateralDecimals = await collateralToken.decimals();

      let assetPrice = (
        await dexRouter.getAmountsOut(BigNumber.from(1).mul((10 ** assetDecimals).toString()), [
          assetTokenAddress,
          wethAddress,
        ])
      )[1];
      let collateralPrice = (
        await dexRouter.getAmountsOut(BigNumber.from(1).mul((10 ** collateralDecimals).toString()), [
          collateralTokenAddress,
          wethAddress,
        ])
      )[1];

      let maturity = BigNumber.from(taskArgs.maturity);

      let targetCDP = 70;

      let lpFee = await creditPair.lpFee();
      let protocolFee = await creditPair.protocolFee();
      let stakingFee = await creditPair.stakingFee();

      let constantProduct = await creditPair.constantProduct(maturity);

      let state: CP = { x: constantProduct[0], y: constantProduct[1], z: constantProduct[2] };

      console.log();
      console.log("USDC/WETH price: ", assetPrice.toString());
      console.log("ARB/WETH price: ", collateralPrice.toString());
      console.log();

      let currentCDP = calculateCdp(state.x, state.z, assetPrice, collateralPrice, assetDecimals, collateralDecimals);

      if (currentCDP.toNumber() >= 100) throw new Error("Pool is not undercollateralized");

      console.log("Current CDP: %s", currentCDP);
      console.log();

      const percent = BigNumber.from(2 ** 31);

      let currentBlock = await hardhatRuntime.ethers.provider.getBlock("latest");

      let assetOut = await getAssetOut(
        targetCDP, // %
        1, // margin %
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
        BigNumber.from(currentBlock.timestamp)
      );

      console.log("Asset out: %s", assetOut.toString());
      console.log();

      currentBlock = await hardhatRuntime.ethers.provider.getBlock("latest");

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

      currentBlock = await hardhatRuntime.ethers.provider.getBlock("latest");

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

      const params = {
        creditPair: taskArgs.creditpairaddress,
        maturity: maturity,
        assetOut: assetOut,
        maxDebt: borrowReturn.dueOut.debt,
        maxCollateral: borrowReturn.dueOut.collateral,
        x: state.x,
        y: state.y,
        z: state.z,
        merkleProof: merkleProof,
      };

      await pairFlash.execute(params);

      console.log("Arbitrage executed");
      console.log();

      constantProduct = await creditPair.constantProduct(maturity);
      state = { x: constantProduct[0], y: constantProduct[1], z: constantProduct[2] };

      assetPrice = (
        await dexRouter.getAmountsOut(BigNumber.from(1).mul((10 ** assetDecimals).toString()), [
          assetTokenAddress,
          wethAddress,
        ])
      )[1];
      collateralPrice = (
        await dexRouter.getAmountsOut(BigNumber.from(1).mul((10 ** collateralDecimals).toString()), [
          collateralTokenAddress,
          wethAddress,
        ])
      )[1];

      console.log();
      console.log("USDC/WETH price: ", assetPrice.toString());
      console.log("ARB/WETH price: ", collateralPrice.toString());
      console.log();

      currentCDP = calculateCdp(state.x, state.z, assetPrice, collateralPrice, assetDecimals, collateralDecimals);

      console.log("New CDP: %s", currentCDP);
    });
};

export { executeArbitrage };

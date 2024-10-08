//import BigNumber from "bignumber.js";
import { BigNumber } from "ethers";
import { getBorrowLimit, givenPercent } from "./BorrowMath";
import { calculateCdp } from "./CDP";
import { CP } from "./types/credit";

export function getAssetOut(
  targetCDP: number,
  margin: number,
  assetDecimals: number,
  collateralDecimals: number,
  assetPrice: BigNumber,
  collateralPrice: BigNumber,
  increment: BigNumber,
  maturity: BigNumber,
  lpFee: BigNumber,
  protocolFee: BigNumber,
  stakingFee: BigNumber,
  state: CP,
  percent: BigNumber,
  now: BigNumber
): Promise<BigNumber> {
  const start = new Date().getTime(); // for timing speed of algorithm

  let borrowLimit = getBorrowLimit(state.x, maturity, lpFee, protocolFee, stakingFee, now).div(increment).toNumber();

  let left: number = 0;
  let right: number = borrowLimit;

  let lowerLimit = targetCDP * (1 - margin / 100);
  let upperLimit = targetCDP * (1 + margin / 100);

  let deltaState;
  let cdp;
  let assetOut;

  while (left <= right) {
    const mid: number = Math.floor((left + right) / 2);

    assetOut = BigNumber.from(mid).mul(increment);

    deltaState = givenPercent(lpFee, protocolFee, stakingFee, state, maturity, assetOut, percent, now);

    cdp = calculateCdp(
      state.x.sub(deltaState.xDecrease),
      state.z.add(deltaState.zIncrease),
      assetPrice,
      collateralPrice,
      assetDecimals,
      collateralDecimals
    );

    if (cdp >= lowerLimit && cdp <= upperLimit) {
      let elapsed = new Date().getTime() - start;
      console.log("Elapsed time: %s", elapsed / 1000);
      console.log();
      return assetOut;
    }
    if (targetCDP < cdp) right = mid - 1;
    else left = mid + 1;
  }

  throw new Error("Asset out solution not found");
}

export default {
  getAssetOut,
};

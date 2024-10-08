import { BigNumber } from "ethers";

import * as CreditMath from "./CreditMath";
import { divUp, mulDivUp, shiftRightUp, sqrtUp } from "./Math";
import { CP, Due } from "./types/credit";

const BASE = BigNumber.from(1099511627776); // 0x10000000000

export function givenPercent(
  fee: BigNumber,
  protocolFee: BigNumber,
  stakingFee: BigNumber,
  state: CP,
  maturity: BigNumber,
  assetOut: BigNumber,
  percent: BigNumber,
  now: BigNumber
): { xDecrease: BigNumber; yIncrease: BigNumber; zIncrease: BigNumber } {
  let yIncrease = BigNumber.from(0);
  let zIncrease = BigNumber.from(0);
  const xDecrease = getX(maturity, assetOut, fee, protocolFee, stakingFee, now);

  const xReserve = state.x.sub(xDecrease);

  if (percent.lte(0x80000000)) {
    let yMin = xDecrease;
    yMin = yMin.mul(state.y);
    yMin = divUp(yMin, xReserve);
    yMin = shiftRightUp(yMin, 4);

    let yMid = state.y.mul(state.y);
    yMid = mulDivUp(yMid, state.x, xReserve);
    yMid = sqrtUp(yMid).sub(state.y);

    yIncrease = yMid.sub(yMin);
    yIncrease = yIncrease.mul(percent);
    yIncrease = shiftRightUp(yIncrease, 31);
    yIncrease = yIncrease.add(yMin);

    const yReserve = state.y.add(yIncrease);

    let zReserve = state.x.mul(state.y);
    const denominator = xReserve.mul(yReserve);
    zReserve = mulDivUp(zReserve, state.z, denominator);

    zIncrease = zReserve.sub(state.z);
    return { xDecrease, yIncrease, zIncrease };
  } else {
    percent = BigNumber.from(0x100000000).sub(percent);

    let zMid = state.z.mul(state.z);
    zMid = mulDivUp(zMid, state.x, xReserve);
    zMid = sqrtUp(zMid).sub(state.z);

    zIncrease = zMid.mul(percent);
    zIncrease = shiftRightUp(zIncrease, 31);

    const zReserve = state.z.add(zIncrease);

    let yReserve = state.x.mul(state.z);
    const denominator = xReserve.mul(zReserve);
    yReserve = mulDivUp(yReserve, state.y, denominator);

    yIncrease = yReserve.sub(state.y);
    return { xDecrease, yIncrease, zIncrease };
  }
}

export function borrow(
  fee: BigNumber,
  protocolFee: BigNumber,
  stakingFee: BigNumber,
  state: CP,
  maturity: BigNumber,
  xDecrease: BigNumber,
  yIncrease: BigNumber,
  zIncrease: BigNumber,
  now: BigNumber
): { assetOut: BigNumber; dueOut: Due; borrowFees: BigNumber } {
  if (now.gte(maturity)) throw new Error("E202");
  if (xDecrease.eq(0)) throw new Error("E205");

  const { dueOut, borrowFees } = CreditMath.borrow(
    maturity,
    state,
    xDecrease,
    yIncrease,
    zIncrease,
    fee,
    protocolFee,
    stakingFee,
    now
  );
  const assetOut = xDecrease.sub(borrowFees);

  return { assetOut, dueOut, borrowFees };
}

function getX(
  maturity: BigNumber,
  assetOut: BigNumber,
  fee: BigNumber,
  protocolFee: BigNumber,
  stakingFee: BigNumber,
  now: BigNumber
): BigNumber {
  const totalFee = fee.add(protocolFee).add(stakingFee);
  const numerator = maturity.sub(now).mul(totalFee).add(BASE);

  let xDecrease = assetOut.mul(numerator);
  xDecrease = divUp(xDecrease, BASE);

  return xDecrease;
}

export function getBorrowLimit(
  X: BigNumber,
  maturity: BigNumber,
  fee: BigNumber,
  protocolFee: BigNumber,
  stakingFee: BigNumber,
  now: BigNumber
) {
  const totalFees = CreditMath.borrowGetFees(maturity, X, fee, protocolFee, stakingFee, now);

  // workaround the E301 by removing 0.5% for safety
  // seems like with a small x, the product ratio is not maintained
  // TODO: investigate this further and find a better solution
  return X.sub(totalFees).mul(995).div(1000);
}

export default {
  givenPercent,
  borrow,
  getBorrowLimit,
};

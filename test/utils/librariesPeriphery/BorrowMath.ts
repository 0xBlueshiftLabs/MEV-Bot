import { divUp, shiftRightUp } from "../librariesCore/Math";
import { mulDivUp, sqrtUp } from "../shared/Helper";

const MAXUINT112 = 2 ** 112;
const MAXUINT256 = 2 ** 256;
const adjust = (reserve: bigint, increase: bigint) => {
  return (reserve << 16n) + (0x10000n - 100n) * increase;
};
const constantProduct = (state: { x: bigint; y: bigint; z: bigint }, delState: { x: bigint; y: bigint; z: bigint }) => {
  if (delState.y * delState.z * delState.x > state.x * state.y * state.z) {
    return true;
  }
  return false;
};
export const check = (state: { x: bigint; y: bigint; z: bigint }, delState: { x: bigint; y: bigint; z: bigint }) => {
  const feeBase = 0x10000n - 100n;
  const xReserve = state.x - delState.x;
  const yAdjust = adjust(state.y, delState.y);
  const zAdjust = adjust(state.z, delState.z);
  if (!constantProduct(state, { x: xReserve, y: yAdjust, z: zAdjust })) {
    return false;
  }
  const minimum = divUp((delState.x * state.y) << 12n, xReserve * feeBase);

  if (delState.y < minimum) {
    return false;
  }

  return true;
};
export const checkError = (
  state: { x: bigint; y: bigint; z: bigint },
  delState: { x: bigint; y: bigint; z: bigint }
) => {
  const feeBase = 0x10000n - 100n;
  const xReserve = state.x - delState.x;
  const yAdjust = adjust(state.y, delState.y);
  const zAdjust = adjust(state.z, delState.z);
  if (!constantProduct(state, { x: xReserve, y: yAdjust, z: zAdjust })) {
    return "Invariance";
  }
  const minimum = divUp((delState.x * state.y) << 12n, xReserve * feeBase);
  if (delState.y < minimum) {
    return "E302";
  }

  return "";
};

export const getBorrowGivenPercentParams = (
  state: { x: bigint; y: bigint; z: bigint },
  protocolFee: bigint,
  fee: bigint,
  stakingFee: bigint,
  assetOut: bigint,
  maturity: bigint,
  currentTime: bigint,
  percent: bigint
) => {
  const xDecrease = getX(protocolFee, fee, stakingFee, maturity, currentTime, assetOut);

  let xReserve = state.x;
  xReserve -= xDecrease;

  if (percent <= 0x80000000) {
    let yMin = xDecrease;
    yMin *= state.y;
    yMin = divUp(yMin, xReserve);
    yMin = shiftRightUp(yMin, 4n);

    let yMid = state.y;
    yMid *= state.y;
    yMid = mulDivUp(yMid, state.x, xReserve);
    yMid = sqrtUp(yMid);
    yMid -= state.y;

    let _yIncrease = yMid;
    _yIncrease -= yMin;
    _yIncrease *= percent;
    _yIncrease = shiftRightUp(_yIncrease, 31n);
    _yIncrease += yMin;

    let yReserve = state.y;
    yReserve += _yIncrease;

    let zReserve = state.x;
    zReserve *= state.y;
    let denominator = xReserve;
    denominator *= yReserve;
    zReserve = mulDivUp(zReserve, state.z, denominator);

    let _zIncrease = zReserve;
    _zIncrease -= state.z;
    return { xDecrease: xDecrease, yIncrease: _yIncrease, zIncrease: _zIncrease };
  } else {
    percent = 0x100000000n - percent;

    let zMid = state.z;
    zMid *= state.z;
    zMid = mulDivUp(zMid, state.x, xReserve);
    zMid = sqrtUp(zMid);
    zMid -= state.z;

    let _zIncrease = zMid;
    _zIncrease *= percent;
    _zIncrease = shiftRightUp(_zIncrease, 31n);

    let zReserve = state.z;
    zReserve += _zIncrease;

    let yReserve = state.x;
    yReserve *= state.z;
    let denominator = xReserve;
    denominator *= zReserve;
    yReserve = mulDivUp(yReserve, state.y, denominator);

    let _yIncrease = yReserve;
    _yIncrease -= state.y;
    return { xDecrease: xDecrease, yIncrease: _yIncrease, zIncrease: _zIncrease };
  }
};

export const getDebt = (delState: { x: bigint; y: bigint; z: bigint }, maturity: bigint, currentTime: bigint) => {
  return shiftRightUp((maturity - currentTime) * delState.y, 32n) + delState.x;
};

export const getCollateral = (
  state: { x: bigint; y: bigint; z: bigint },
  delState: { x: bigint; y: bigint; z: bigint },
  maturity: bigint,
  currentTime: bigint
) => {
  return shiftRightUp((maturity - currentTime) * delState.z, 25n) + divUp(state.z * delState.x, state.x - delState.x);
};

export const getX = (
  protocolFee: bigint,
  fee: bigint,
  stakingFee: bigint,
  maturity: bigint,
  currentTime: bigint,
  assetOut: bigint
) => {
  const BASE = 0x10000000000n;
  return divUp(assetOut * ((maturity - currentTime) * (fee + protocolFee + stakingFee) + BASE), BASE);
};

import { divUp } from "../librariesCore/Math";
import { mulDivUp, sqrtUp } from "../shared/Helper";

const MAXUINT112: bigint = 2n ** 112n;
const MAXUINT256 = 1n << 256n;

export const getLendGivenPercentParams = (
  state: { x: bigint; y: bigint; z: bigint },
  maturity: bigint,
  currentTime: bigint,
  fee: bigint,
  protocolFee: bigint,
  stakingFee,
  assetIn: bigint,
  percent: bigint
) => {
  let xIncrease = getX(fee, protocolFee, stakingFee, maturity, currentTime, assetIn);

  let xReserve = state.x;
  xReserve += xIncrease;

  if (percent <= 0x80000000) {
    let yMin = xIncrease;
    yMin *= state.y;
    yMin = divUp(yMin, xReserve);
    yMin >>= 4n;

    let yMid = state.y;
    let subtrahend = state.y;
    subtrahend *= state.y;
    subtrahend = mulDivUp(subtrahend, state.x, xReserve);
    subtrahend = sqrtUp(subtrahend);
    yMid -= subtrahend;

    let _yDecrease = yMid;
    _yDecrease -= yMin;
    _yDecrease *= percent;
    _yDecrease >>= 31n;
    _yDecrease += yMin;

    let yReserve = state.y;
    yReserve -= _yDecrease;

    let zReserve = state.x;
    zReserve *= state.y;
    let denominator = xReserve;
    denominator *= yReserve;
    zReserve = mulDivUp(zReserve, state.z, denominator);

    let _zDecrease = state.z;
    _zDecrease -= zReserve;

    return { xIncrease: xIncrease, yDecrease: _yDecrease, zDecrease: _zDecrease };
  } else {
    percent = 0x100000000n - percent;

    let zMid = state.z;
    let subtrahend = state.z;
    subtrahend *= state.z;
    subtrahend = mulDivUp(subtrahend, state.z, xReserve);
    subtrahend = sqrtUp(subtrahend);
    zMid -= subtrahend;

    let _zDecrease = zMid;
    _zDecrease *= percent;
    _zDecrease >>= 31n;

    let zReserve = state.z;
    zReserve -= _zDecrease;

    let yReserve = state.x;
    yReserve *= state.z;
    let denominator = xReserve;
    denominator *= zReserve;
    yReserve = mulDivUp(yReserve, state.y, denominator);

    let _yDecrease = state.y;
    _yDecrease -= yReserve;

    return { xIncrease: xIncrease, yDecrease: _yDecrease, zDecrease: _zDecrease };
  }
};
const adjust = (reserve: bigint, decrease: bigint, feeBase: bigint) => {
  return (reserve << 16n) - feeBase * decrease;
};

const checkConstantProduct = (
  state: {
    x: bigint;
    y: bigint;
    z: bigint;
  },
  adjDelState: {
    x: bigint;
    y: bigint;
    z: bigint;
  }
) => {
  if (adjDelState.y * adjDelState.z * adjDelState.x > state.y * (state.z << 32n) * state.x) {
    return true;
  }
  return false;
};

export const check = (
  state: {
    x: bigint;
    y: bigint;
    z: bigint;
  },
  delState: {
    x: bigint;
    y: bigint;
    z: bigint;
  }
) => {
  const feeBase = BigInt(0x10000 + 100);
  const xReserve = delState.x + state.x;
  const yAdjusted = adjust(state.y, delState.y, feeBase);
  const zAdjusted = adjust(state.z, delState.z, feeBase);
  if (checkConstantProduct(state, { x: xReserve, y: yAdjusted, z: zAdjusted })) {
    const minimum = ((delState.x * state.y) << 12n) / (xReserve * feeBase);
    if (delState.y < minimum) {
      return false;
    } else {
      return true;
    }
  } else {
    return false;
  }
};

export const checkError = (
  state: {
    x: bigint;
    y: bigint;
    z: bigint;
  },
  delState: {
    x: bigint;
    y: bigint;
    z: bigint;
  }
) => {
  const feeBase = BigInt(0x10000 + 100);
  const xReserve = delState.x + state.x;
  const yAdjusted = adjust(state.y, delState.y, feeBase);
  const zAdjusted = adjust(state.z, delState.z, feeBase);
  if (checkConstantProduct(state, { x: xReserve, y: yAdjusted, z: zAdjusted })) {
    const minimum = ((delState.x * state.y) << 12n) / (xReserve * feeBase);
    if (delState.y < minimum) {
      return "Minimum";
    } else {
      return "";
    }
  } else {
    return "Invariance";
  }
};

export const getLoan = (delState: { x: bigint; y: bigint; z: bigint }, maturity: bigint, currentTime: bigint) => {
  return (((maturity - currentTime) * delState.y) >> 32n) + delState.x;
};
export const getCoverage = (
  state: { x: bigint; y: bigint; z: bigint },
  delState: { x: bigint; y: bigint; z: bigint },
  maturity: bigint,
  currentTime: bigint
) => {
  const _coverageOut = ((maturity - currentTime) * delState.z) >> 25n;
  const denominator = delState.x + state.x;
  const minimum = (state.z * delState.x) / denominator;

  return _coverageOut + minimum;
};

export const getCoveragePrincipal = (
  state: { x: bigint; y: bigint; z: bigint },
  delState: { x: bigint; y: bigint; z: bigint }
): bigint => {
  return (state.z * delState.x) / (state.x + delState.x);
};

export const getCoverageInterest = (
  delState: { x: bigint; y: bigint; z: bigint },
  maturity: bigint,
  currentTime: bigint
): bigint => {
  return ((maturity - currentTime) * delState.z) >> 25n;
};

export const getX = (
  protocolFee: bigint,
  fee: bigint,
  stakingFee: bigint,
  maturity: bigint,
  currentTime: bigint,
  assetIn: bigint
) => {
  const duration = maturity - currentTime;

  const BASE = 0x10000000000n;
  let denominator = duration * (fee + protocolFee + stakingFee) + BASE;

  let xIncrease = (assetIn * BASE) / denominator;

  return xIncrease;
};

export const getLendFee = (
  maturity: bigint,
  currentTime: bigint,
  xIncrease: bigint,
  fee: bigint,
  protocolFee: bigint,
  stakingFee: bigint
) => {
  const BASE = 0x10000000000n;

  let totalFee = fee;
  totalFee += protocolFee;

  let numerator = maturity;
  numerator -= currentTime;
  numerator *= totalFee;
  numerator += BASE;

  let adjusted = xIncrease;
  adjusted *= numerator;
  adjusted = divUp(adjusted, BASE);
  let totalFeeStoredIncrease = adjusted;
  totalFeeStoredIncrease -= xIncrease;

  let feeStoredIncrease = totalFeeStoredIncrease;
  feeStoredIncrease *= fee;
  feeStoredIncrease /= totalFee;
  let protocolFeeStoredIncrease = totalFeeStoredIncrease;
  protocolFeeStoredIncrease *= protocolFee;
  protocolFeeStoredIncrease /= totalFee;

  let stakingFeeStoredIncrease = totalFeeStoredIncrease;
  stakingFeeStoredIncrease -= fee;
  stakingFeeStoredIncrease -= protocolFee;

  return {
    feeStoredIncrease,
    protocolFeeStoredIncrease,
    stakingFeeStoredIncrease,
  };
};

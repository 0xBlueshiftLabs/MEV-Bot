import { BigNumber } from "ethers";
import { checkConstantProduct } from "./ConstantProduct";
import { divUp } from "./Math";

const MaxUint112 = BigNumber.from(2).pow(112).sub(1);

export function getFees(
  maturity: bigint,
  assetIn: bigint,
  fee: bigint,
  protocolFee: bigint,
  stakingFee: bigint,
  now: bigint
) {
  let totalFee = fee;
  totalFee += protocolFee;
  totalFee += stakingFee;

  let numerator = maturity;
  numerator -= now;
  numerator *= totalFee;
  numerator += 0x10000000000n;

  let adjusted = assetIn;
  adjusted *= numerator;
  adjusted = divUp(adjusted, 0x10000000000n);

  const totalFeeStoredIncrease = adjusted - assetIn;

  let feeStoredIncrease = totalFeeStoredIncrease;
  feeStoredIncrease *= fee;
  feeStoredIncrease /= totalFee;

  let protocolFeeStoredIncrease = totalFeeStoredIncrease;
  protocolFeeStoredIncrease *= protocolFee;
  protocolFeeStoredIncrease /= totalFee;

  let stakingFeeStoredIncrease = totalFeeStoredIncrease - (feeStoredIncrease + protocolFeeStoredIncrease);

  return {
    feeStoredIncrease: feeStoredIncrease,
    protocolFeeStoredIncrease: protocolFeeStoredIncrease,
    stakingFeeStoredIncrease: stakingFeeStoredIncrease,
  };
}

export function check(
  state: {
    asset: bigint;
    interest: bigint;
    cdp: bigint;
  },
  assetIn: bigint,
  interestDecrease: bigint,
  cdpDecrease: bigint
): boolean | string {
  if (interestDecrease > state.interest) throw Error("interestDecrease > state.interest");
  if (cdpDecrease > state.cdp) throw new Error("cdpDecrease > state.cdp");

  const xReserve = state.asset + assetIn;
  if (xReserve > BigInt(MaxUint112.toString())) throw new Error("xReserve > Uint112");

  const yReserve = state.interest - interestDecrease;
  if (yReserve > BigInt(MaxUint112.toString())) throw new Error("yReserve > Uint112");

  const zReserve = state.cdp - cdpDecrease;
  if (zReserve > BigInt(MaxUint112.toString())) throw new Error("zReserve > Uint112");

  if (!checkConstantProduct(state, xReserve, yReserve, zReserve)) throw new Error("Invariance");

  const yMin = ((assetIn * yReserve) / xReserve) >> 4n;
  if (!(interestDecrease - yMin >= 0)) throw new Error("E217");
  return true;
}

export function getLoanInterest(maturity: bigint, interestDecrease: bigint, now: bigint): bigint {
  let _loanInterestOut = maturity;
  _loanInterestOut -= now;
  _loanInterestOut *= interestDecrease;
  _loanInterestOut >>= 32n;
  if (_loanInterestOut > BigInt(MaxUint112.toString())) throw Error("loanInterestOut > Uint112");
  return _loanInterestOut;
}

export function getCoveragePrincipal(
  state: {
    asset: bigint;
    interest: bigint;
    cdp: bigint;
  },
  assetIn: bigint
): bigint {
  let coveragePrincipalOut = state.cdp;
  coveragePrincipalOut *= assetIn;
  let denominator = state.asset;
  denominator += assetIn;
  coveragePrincipalOut /= denominator;
  if (coveragePrincipalOut > BigInt(MaxUint112.toString())) throw Error("coveragePrincipalOut > Uint112");
  return coveragePrincipalOut;
}

export function getCoverageInterest(maturity: bigint, cdpDecrease: bigint, now: bigint) {
  let _coverageInterestOut = maturity;
  _coverageInterestOut -= now;
  _coverageInterestOut *= cdpDecrease;
  _coverageInterestOut >>= 25n;
  if (_coverageInterestOut > BigInt(MaxUint112.toString())) throw Error("coverageInterestOut > Uint112");
  return _coverageInterestOut;
}

export default {
  check,
  getLoanInterest,
  getCoverageInterest,
  getCoveragePrincipal,
  getFees,
};

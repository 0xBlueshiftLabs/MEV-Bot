import { State } from "../shared/PairInterface";
import { mulDiv } from "./FullMath";
import { divUp } from "./Math";

export function getAsset(state: State, liquidityIn: bigint): bigint {
  let totalLoan = state.totalClaims.loanPrincipal + state.totalClaims.loanInterest;
  if (state.reserves.asset >= totalLoan) {
    let _assetOut = state.reserves.asset;
    _assetOut -= totalLoan;
    _assetOut = mulDiv(_assetOut, liquidityIn, state.totalLiquidity);
    return _assetOut;
  } else return 0n;
}

export function getCollateral(state: State, liquidityIn: bigint): bigint {
  let totalLoan = state.totalClaims.loanPrincipal + state.totalClaims.loanInterest;
  let totalCoverage = state.totalClaims.coveragePrincipal + state.totalClaims.coverageInterest;
  let _collateralOut = state.reserves.collateral;
  if (state.reserves.asset >= totalLoan) {
    _collateralOut = mulDiv(_collateralOut, liquidityIn, state.totalLiquidity);
    return _collateralOut;
  } else {
    let deficit = totalLoan;
    deficit -= state.reserves.asset;
    if (state.reserves.collateral * totalLoan > deficit * totalCoverage) {
      let _collateralOut = state.reserves.collateral;
      let subtrahend = deficit;
      subtrahend *= totalCoverage;
      subtrahend = divUp(subtrahend, totalLoan);
      _collateralOut -= subtrahend;
      _collateralOut = mulDiv(_collateralOut, liquidityIn, state.totalLiquidity);
      console.log("returning");
      return _collateralOut;
    } else {
      return 0n;
    }
  }
}
export function getFee(state: State, liquidityIn: bigint) {
  return mulDiv(state.lpFeeStored, liquidityIn, state.totalLiquidity);
}

export default {
  getAsset,
  getCollateral,
  getFee,
};

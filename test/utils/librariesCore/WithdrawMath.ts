import { State, Tokens, TotalClaims } from "../shared/PairInterface";
import { mulDiv } from "./FullMath";

export function getTokensOut(state: State, claimsIn: TotalClaims): Tokens {
  let totalAsset = state.reserves.asset;
  let totalLoanPrincipal = state.totalClaims.loanPrincipal;
  let totalLoanInterest = state.totalClaims.loanInterest;
  let totalLoan = totalLoanPrincipal;
  totalLoan += totalLoanInterest;
  let tokensOut: Tokens = {
    asset: 0n,
    collateral: 0n,
  };

  if (totalAsset >= totalLoan) {
    tokensOut.asset = claimsIn.loanPrincipal;
    tokensOut.asset += claimsIn.loanInterest;
  } else {
    if (totalAsset >= totalLoanPrincipal) {
      let remaining = totalAsset;
      remaining -= totalLoanPrincipal;
      let _assetOut = claimsIn.loanInterest;
      _assetOut *= remaining;
      _assetOut /= totalLoanInterest;
      _assetOut += claimsIn.loanPrincipal;
      tokensOut.asset = _assetOut;
    } else {
      let _assetOut = claimsIn.loanPrincipal;
      _assetOut *= totalAsset;
      _assetOut /= totalLoanPrincipal;
      tokensOut.asset = _assetOut;
    }

    let deficit = totalLoan;
    deficit -= totalAsset;

    let totalCoveragePrincipal = state.totalClaims.coveragePrincipal;
    totalCoveragePrincipal *= deficit;
    let totalCoverageInterest = state.totalClaims.coverageInterest;
    totalCoverageInterest *= deficit;
    let totalCoverage = totalCoveragePrincipal;
    totalCoverage += totalCoverageInterest;

    let totalCollateral = state.reserves.collateral;
    totalCollateral *= totalLoan;

    if (totalCollateral >= totalCoverage) {
      let _collateralOut = claimsIn.coveragePrincipal;
      _collateralOut += claimsIn.coverageInterest;
      _collateralOut *= deficit;
      _collateralOut /= totalLoan;
      tokensOut.collateral = _collateralOut;
    } else if (totalCollateral >= totalCoveragePrincipal) {
      let remaining = totalCollateral;
      remaining -= totalCoveragePrincipal;
      let _collateralOut = claimsIn.coverageInterest;
      _collateralOut *= deficit;
      let denominator = totalCoverageInterest;
      denominator *= totalLoan;
      _collateralOut = mulDiv(_collateralOut, remaining, denominator);
      let addend = claimsIn.coveragePrincipal;
      addend *= deficit;
      addend /= totalLoan;
      _collateralOut += addend;
      tokensOut.collateral = _collateralOut;
    } else {
      let _collateralOut = claimsIn.coveragePrincipal;
      _collateralOut *= deficit;
      let denominator = totalCoveragePrincipal;
      denominator *= totalLoan;
      _collateralOut = mulDiv(_collateralOut, totalCollateral, denominator);
      tokensOut.collateral = _collateralOut;
    }
  }

  return tokensOut;
}

export default {
  getTokensOut,
};

//import BigNumber from "bignumber.js";
import { BigNumber } from "ethers";

import { divUp, mulDiv, mulDivUp, shiftRightUp } from "./Math";
import { CP, Claims, Due } from "./types/credit";

const BASE = BigNumber.from(1099511627776); // 0x10000000000

export function mint(
  maturity: BigNumber,
  state: CP,
  totalLiquidity: BigNumber,
  feeStored: BigNumber,
  xIncrease: BigNumber,
  yIncrease: BigNumber,
  zIncrease: BigNumber,
  now: BigNumber
): {
  liquidityOut: BigNumber;
  dueOut: Due;
  feeStoredIncrease: BigNumber;
} {
  let liquidityOut = BigNumber.from(0);
  let feeStoredIncrease = BigNumber.from(0);

  if (totalLiquidity.eq(0)) {
    liquidityOut = xIncrease.mul(Math.pow(2, 16));
  } else {
    const fromX = mulDiv(totalLiquidity, xIncrease, state.x);
    const fromY = mulDiv(totalLiquidity, yIncrease, state.y);
    const fromZ = mulDiv(totalLiquidity, zIncrease, state.z);

    if (!fromY.lte(fromX)) console.error("E214");
    if (!fromZ.lte(fromX)) console.error("E215");

    liquidityOut = fromY.lte(fromZ) ? fromY : fromZ;
    feeStoredIncrease = mulDivUp(feeStored, liquidityOut, totalLiquidity);
  }

  let debt = maturity.sub(now).mul(yIncrease);
  debt = shiftRightUp(debt, 32).add(xIncrease);

  let collateral = maturity.sub(now).mul(zIncrease);
  collateral = shiftRightUp(collateral, 25).add(zIncrease);

  return { liquidityOut, dueOut: { debt, collateral }, feeStoredIncrease };
}

export function burn(
  totalLiquidity: BigNumber,
  feeStored: BigNumber,
  reserves: { asset: BigNumber; collateral: BigNumber },
  totalClaims: Claims,
  liquidityIn: BigNumber
): {
  assetOut: BigNumber;
  collateralOut: BigNumber;
  feeOut: BigNumber;
} {
  let assetOut = BigNumber.from(0);
  let collateralOut = BigNumber.from(0);

  const totalAsset = reserves.asset;
  const totalCollateral = reserves.collateral;
  const totalBond = totalClaims.loanPrincipal.add(totalClaims.loanInterest);

  if (totalAsset.gte(totalBond)) {
    assetOut = totalAsset.sub(totalBond);
    assetOut = mulDiv(assetOut, liquidityIn, totalLiquidity);

    collateralOut = mulDiv(totalCollateral, liquidityIn, totalLiquidity);
  } else {
    const deficit = totalBond.sub(totalAsset);

    const totalInsurance = totalClaims.coveragePrincipal.add(totalClaims.coverageInterest);

    if (totalCollateral.mul(totalBond).gt(deficit.mul(totalInsurance))) {
      let subtrahend = deficit.mul(totalInsurance);
      subtrahend = divUp(subtrahend, totalBond);
      collateralOut = totalCollateral.sub(subtrahend);
      collateralOut = mulDiv(collateralOut, liquidityIn, totalLiquidity);
    }
  }

  const feeOut = mulDiv(feeStored, liquidityIn, totalLiquidity);

  return { assetOut, collateralOut, feeOut };
}

export const lendGetFees = (
  maturity: BigNumber,
  xIncrease: BigNumber,
  fee: BigNumber,
  protocolFee: BigNumber,
  stakingFee: BigNumber,
  now: BigNumber
) => {
  const totalFee = fee.add(protocolFee).add(stakingFee);

  const numerator = BigNumber.from(maturity).sub(now).mul(totalFee).add(BASE);
  let adjusted = xIncrease;
  adjusted = adjusted.mul(numerator);
  adjusted = divUp(adjusted, BASE);
  let totalFeeStoredIncrease = adjusted.sub(xIncrease);
  return totalFeeStoredIncrease;
};

export const borrowGetFees = (
  maturity: BigNumber,
  xDecrease: BigNumber,
  fee: BigNumber,
  protocolFee: BigNumber,
  stakingFee: BigNumber,
  now: BigNumber
) => {
  const totalFee = fee.add(protocolFee).add(stakingFee);

  const denominator = maturity.sub(now).mul(totalFee).add(BASE);
  const adjusted = xDecrease.mul(BASE).div(denominator);
  const totalFeeStoredIncrease = xDecrease.sub(adjusted);
  return totalFeeStoredIncrease;
};

export function lend(
  maturity: BigNumber,
  state: CP,
  xIncrease: BigNumber,
  yDecrease: BigNumber,
  zDecrease: BigNumber,
  fee: BigNumber,
  protocolFee: BigNumber,
  stakingFee: BigNumber,
  now: BigNumber
): {
  claimsOut: Claims;
  lendFees: BigNumber;
} {
  const loanPrincipal = xIncrease;
  const loanInterest = getBondInterest(maturity, yDecrease, now);
  const coveragePrincipal = getInsurancePrincipal(state, xIncrease);
  const coverageInterest = getInsuranceInterest(maturity, zDecrease, now);

  const lendFees = lendGetFees(maturity, xIncrease, fee, protocolFee, stakingFee, now);

  return {
    claimsOut: {
      loanPrincipal,
      loanInterest,
      coveragePrincipal,
      coverageInterest,
    },
    lendFees,
  };
}

export function borrow(
  maturity: BigNumber,
  state: CP,
  xDecrease: BigNumber,
  yIncrease: BigNumber,
  zIncrease: BigNumber,
  fee: BigNumber,
  protocolFee: BigNumber,
  stakingFee: BigNumber,
  now: BigNumber
): {
  dueOut: Due;
  borrowFees: BigNumber;
} {
  borrowCheck(state, xDecrease, yIncrease, zIncrease);

  const debt = getDebt(maturity, xDecrease, yIncrease, now);
  const collateral = getCollateral(maturity, state, xDecrease, zIncrease, now);

  const borrowFees = borrowGetFees(maturity, xDecrease, fee, protocolFee, stakingFee, now);

  return {
    dueOut: { debt, collateral },
    borrowFees,
  };
}

export function getDebt(maturity: BigNumber, xDecrease: BigNumber, yIncrease: BigNumber, now: BigNumber): BigNumber {
  let debtIn = maturity.sub(now).mul(yIncrease);
  debtIn = shiftRightUp(debtIn, 32).add(xDecrease);
  return debtIn;
}

function getCollateral(
  maturity: BigNumber,
  state: CP,
  xDecrease: BigNumber,
  zIncrease: BigNumber,
  now: BigNumber
): BigNumber {
  let collateralIn = maturity.sub(now).mul(zIncrease);
  collateralIn = shiftRightUp(collateralIn, 25);

  let minimum = state.z.mul(xDecrease);
  const denominator = state.x.sub(xDecrease);
  minimum = divUp(minimum, denominator);

  collateralIn = collateralIn.add(minimum);
  return collateralIn;
}

export function getInsurancePrincipal(state: CP, xIncrease: BigNumber): BigNumber {
  let _coveragePrincipalOut = state.z;
  _coveragePrincipalOut = _coveragePrincipalOut.mul(xIncrease);
  let denominator = state.x;
  denominator = denominator.add(xIncrease);
  _coveragePrincipalOut = _coveragePrincipalOut.div(denominator);
  return _coveragePrincipalOut;
}

export function getBondInterest(maturity: BigNumber, yDecrease: BigNumber, now: BigNumber): BigNumber {
  return maturity.sub(now).mul(yDecrease).div(Math.pow(2, 32));
}

export function getInsuranceInterest(maturity: BigNumber, zDecrease: BigNumber, now: BigNumber): BigNumber {
  return maturity.sub(now).mul(zDecrease).div(Math.pow(2, 25));
}

function borrowCheck(state: CP, xDecrease: BigNumber, yIncrease: BigNumber, zIncrease: BigNumber) {
  const xReserve = state.x.sub(xDecrease);
  const yReserve = state.y.add(yIncrease);
  const zReserve = state.z.add(zIncrease);
  checkConstantProduct(state, xReserve, yReserve, zReserve);

  let yMax = xDecrease.mul(state.y);
  yMax = divUp(yMax, xReserve);
  if (yIncrease.gt(yMax)) throw new Error("E214");

  let zMax = xDecrease.mul(state.z);
  zMax = divUp(zMax, xReserve);
  if (zIncrease.gt(zMax)) throw new Error("E215");

  let yMin = yMax;
  yMin = shiftRightUp(yMin, 4);
  if (yMin.gt(yIncrease)) throw new Error("E217");
}

export function checkConstantProduct(state: CP, xReserve: BigNumber, yAdjusted: BigNumber, zAdjusted: BigNumber) {
  const newProd = yAdjusted.mul(zAdjusted).mul(xReserve);
  const oldProd = state.y.mul(state.z).mul(state.x);
  if (newProd.lt(oldProd)) throw new Error("E301");
}

interface TotalClaims {
  loanPrincipal: BigNumber;
  loanInterest: BigNumber;
  coveragePrincipal: BigNumber;
  coverageInterest: BigNumber;
}

export function withdraw(
  assetReserve: BigNumber,
  collateralReserve: BigNumber,
  totalClaims: TotalClaims,
  claimsIn: TotalClaims
) {
  let assetOut = BigNumber.from(0);
  let collateralOut = BigNumber.from(0);
  let totalAsset = assetReserve;
  let totalLoanPrincipal = totalClaims.loanPrincipal;
  let totalLoanInterest = totalClaims.loanInterest;
  let totalLoan = totalLoanPrincipal;
  totalLoan = totalLoan.add(totalLoanInterest);

  if (totalAsset.gte(totalLoan)) {
    assetOut = claimsIn.loanPrincipal;
    assetOut = assetOut.add(claimsIn.loanInterest);
  } else {
    if (totalAsset.gte(totalLoanPrincipal)) {
      let remaining = totalAsset;
      remaining = remaining.sub(totalLoanPrincipal);
      let _assetOut = claimsIn.loanInterest;
      _assetOut = assetOut.mul(remaining);
      _assetOut = _assetOut.div(totalLoanInterest);
      _assetOut = _assetOut.add(claimsIn.loanPrincipal);
      assetOut = _assetOut;
    } else {
      let _assetOut = claimsIn.loanPrincipal;
      _assetOut = _assetOut.mul(totalAsset);
      _assetOut = _assetOut.div(totalLoanPrincipal);
      assetOut = _assetOut;
    }

    let deficit = totalLoan;
    deficit = deficit.sub(totalAsset);

    let totalCoveragePrincipal = totalClaims.coveragePrincipal;
    totalCoveragePrincipal = totalCoveragePrincipal.mul(deficit);
    let totalCoverageInterest = totalClaims.coverageInterest;
    totalCoverageInterest = totalCoverageInterest.mul(deficit);
    let totalCoverage = totalCoveragePrincipal;
    totalCoverage = totalCoverage.add(totalCoverageInterest);

    let totalCollateral = collateralReserve;
    totalCollateral = totalCollateral.mul(totalLoan);

    if (totalCollateral.gte(totalCoverage)) {
      let _collateralOut = claimsIn.coveragePrincipal;
      _collateralOut = _collateralOut.add(claimsIn.coverageInterest);
      _collateralOut = _collateralOut.mul(deficit);
      _collateralOut = _collateralOut.div(totalLoan);
      collateralOut = _collateralOut;
    } else if (totalCollateral.gte(totalCoveragePrincipal)) {
      let remaining = totalCollateral;
      remaining = remaining.sub(totalCoveragePrincipal);
      let _collateralOut = claimsIn.coverageInterest;
      _collateralOut = _collateralOut.mul(deficit);
      let denominator = totalCoverageInterest;
      denominator = denominator.mul(totalLoan);
      _collateralOut = mulDiv(_collateralOut, remaining, denominator);
      let addend = claimsIn.coveragePrincipal;
      addend = addend.mul(deficit);
      addend = addend.div(totalLoan);
      _collateralOut = _collateralOut.add(addend);
      collateralOut = _collateralOut;
    } else {
      let _collateralOut = claimsIn.coveragePrincipal;
      _collateralOut = _collateralOut.mul(deficit);
      let denominator = totalCoveragePrincipal;
      denominator = denominator.mul(totalLoan);
      _collateralOut = mulDiv(_collateralOut, totalCollateral, denominator);
      collateralOut = _collateralOut;
    }
  }

  return { assetOut, collateralOut };
}

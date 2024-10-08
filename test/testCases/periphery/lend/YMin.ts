const testCases = [
  {
    newLiquidityParams: {
      assetIn: 100000000n,
      debtIn: 120000000n,
      collateralIn: 100000000n,
    },
    lendGivenPercentParams: {
      assetIn: 10n,
      percent: 0x10000000n,
      minLoan: 0n,
      minCoverage: 0n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 100000000n,
      debtIn: 120000000n,
      collateralIn: 100000000n,
    },
    lendGivenPercentParams: {
      assetIn: 2n,
      percent: 0x80000000n,
      minLoan: 0n,
      minCoverage: 0n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 100000000n,
      debtIn: 120000000n,
      collateralIn: 100000000n,
    },
    lendGivenPercentParams: {
      assetIn: 100000000n,
      percent: 0x00000000n,
      minLoan: 0n,
      minCoverage: 0n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 100000000n,
      debtIn: 120000000n,
      collateralIn: 100000000n,
    },
    lendGivenPercentParams: {
      assetIn: 100000000n,
      percent: 0x00000000n,
      minLoan: 0n,
      minCoverage: 0n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 100000000n,
      debtIn: 120000000n,
      collateralIn: 100000000n,
    },
    lendGivenPercentParams: {
      assetIn: 100000000n,
      percent: 0x70000000n,
      minLoan: 0n,
      minCoverage: 0n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 100000000n,
      debtIn: 120000000n,
      collateralIn: 100000000n,
    },
    lendGivenPercentParams: {
      assetIn: 200000000n,
      percent: 0x40000000n,
      minLoan: 0n,
      minCoverage: 0n,
    },
  },
];
//scenaros where yDecrease would be zero
export default testCases;

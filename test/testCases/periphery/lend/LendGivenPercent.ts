const testCases = [
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    lendGivenPercentParams: {
      assetIn: 1000n,
      percent: 1n << 31n,
      minLoan: 1000n,
      minCoverage: 50n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    lendGivenPercentParams: {
      assetIn: 100000n,
      percent: 2n << 31n,
      minLoan: 100000n,
      minCoverage: 400n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    lendGivenPercentParams: {
      assetIn: 500n,
      percent: 4n << 30n,
      minLoan: 500n,
      minCoverage: 20n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    lendGivenPercentParams: {
      assetIn: 1000000000n,
      percent: 2n << 30n,
      minLoan: 800000000n,
      minCoverage: 500n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    lendGivenPercentParams: {
      assetIn: 67900000000n,
      percent: 1n << 31n,
      minLoan: 65000000000n,
      minCoverage: 500n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000000000000000000000n,
      debtIn: 12000000000000000000000n,
      collateralIn: 990000000000000000000n,
    },
    lendGivenPercentParams: {
      assetIn: 100000000000000000000n,
      percent: 1n << 31n,
      minLoan: 100000000000000000000n,
      minCoverage: 1000000000000000000n,
    },
  },
];

export default testCases;

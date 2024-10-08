const testCases = [
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    lendGivenPercent: {
      assetIn: 1000n,
      percent: 1n << 31n,
      minLoan: 1000n,
      minCoverage: 50n,
    },
    collectParams: {
      creditPositionId: 1n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    lendGivenPercent: {
      assetIn: 500n,
      percent: 4n << 30n,
      minLoan: 500n,
      minCoverage: 20n,
    },
    collectParams: {
      creditPositionId: 1n,
    },
  },
];
export default testCases;

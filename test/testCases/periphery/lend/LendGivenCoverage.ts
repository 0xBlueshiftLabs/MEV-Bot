const testCases = [
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    lendGivenCoverageParams: {
      assetIn: 1000n,
      coverageOut: 67n,
      minLoan: 1050n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    lendGivenCoverageParams: {
      assetIn: 1000000000n,
      coverageOut: 995n,
      minLoan: 1050n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    lendGivenCoverageParams: {
      assetIn: 1000n,
      coverageOut: 67n,
      minLoan: 1050n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000000000000000000000n,
      debtIn: 12000000000000000000000n,
      collateralIn: 1000000000000000000000n,
    },
    lendGivenCoverageParams: {
      assetIn: 1000000000000000000000n,
      coverageOut: 67000000000000000000n,
      minLoan: 1050000000000000000000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000000000000000000000n,
      debtIn: 12000000000000000000000n,
      collateralIn: 1000000000000000000000n,
    },
    lendGivenCoverageParams: {
      assetIn: 1000000000000000000000000000n,
      coverageOut: 995000000000000000000n,
      minLoan: 1050000000000000000000n,
    },
  },
];

export default testCases;

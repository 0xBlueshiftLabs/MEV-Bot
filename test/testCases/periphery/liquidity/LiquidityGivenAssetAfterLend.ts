const testcases = [
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
    liquidityGivenAssetParams: {
      assetIn: 10000n,
      minLiquidity: 5700000n,
      maxDebt: 12000n,
      maxCollateral: 10000n,
    },
  },
];
export default testcases;

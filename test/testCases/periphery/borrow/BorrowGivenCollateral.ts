const testCases = [
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    borrowGivenCollateralParams: {
      assetOut: 1000n,
      collateralIn: 90n,
      maxDebt: 2000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    borrowGivenCollateralParams: {
      assetOut: 2000n,
      collateralIn: 190n,
      maxDebt: 3000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000000000000000000000n,
      debtIn: 12000000000000000000000n,
      collateralIn: 990000000000000000000n,
    },
    borrowGivenCollateralParams: {
      assetOut: 1000000000000000000000n,
      collateralIn: 100003527586059978031n,
      maxDebt: 1210000000000000000000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000000000000000000000n,
      debtIn: 12000000000000000000000n,
      collateralIn: 990000000000000000000n,
    },
    borrowGivenCollateralParams: {
      assetOut: 1000n,
      collateralIn: 85n,
      maxDebt: 1200n,
    },
  },
];

export default testCases;

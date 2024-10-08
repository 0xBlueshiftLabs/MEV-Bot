const testCases = [
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    borrowGivenPercentParams: {
      assetOut: 1000n,
      percent: 1n << 31n,
      maxDebt: 2000n,
      maxCollateral: 1000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    borrowGivenPercentParams: {
      assetOut: 2000n,
      percent: 2n << 30n,
      maxDebt: 3000n,
      maxCollateral: 5000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    borrowGivenPercentParams: {
      assetOut: 5000n,
      percent: 1n << 29n,
      maxDebt: 10000n,
      maxCollateral: 100000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 100000000n,
      debtIn: 120000000n,
      collateralIn: 10000000n,
    },
    borrowGivenPercentParams: {
      assetOut: 500000n,
      percent: 1n << 29n,
      maxDebt: 1000000n,
      maxCollateral: 10000000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000000000000000000000n,
      debtIn: 12000000000000000000000n,
      collateralIn: 1000000000000000000000n,
    },
    borrowGivenPercentParams: {
      assetOut: 1000000000000000000000n,
      percent: 1n << 29n,
      maxDebt: 1510000000000000000000n,
      maxCollateral: 5000000000000000000000n,
    },
  },
];

export default testCases;

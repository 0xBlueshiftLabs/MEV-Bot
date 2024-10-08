const testCases = [
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    borrowGivenDebtParams: {
      assetOut: 1000n,
      debtIn: 1200n,
      maxCollateral: 5000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    borrowGivenDebtParams: {
      assetOut: 2000n,
      debtIn: 2247n,
      maxCollateral: 200n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    borrowGivenDebtParams: {
      assetOut: 5000n,
      debtIn: 5231n,
      maxCollateral: 1000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    borrowGivenDebtParams: {
      assetOut: 1000n,
      debtIn: 1114n,
      maxCollateral: 100n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000000000000000000000n,
      debtIn: 12000000000000000000000n,
      collateralIn: 990000000000000000000n,
    },
    borrowGivenDebtParams: {
      assetOut: 100000000000000000000n,
      debtIn: 110000000000000000000n,
      maxCollateral: 200000000000000000000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000000000000000000000n,
      debtIn: 12000000000000000000000n,
      collateralIn: 1000000000000000000000n,
    },
    borrowGivenDebtParams: {
      assetOut: 1000000000000000000000n,
      debtIn: 1200000000000000000000n,
      maxCollateral: 5000000000000000000000n,
    },
  },
];

export default testCases;

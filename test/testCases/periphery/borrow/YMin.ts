const testcases = [
  {
    newLiquidityParams: {
      assetIn: 1000000n,
      debtIn: 1200000n,
      collateralIn: 100000n,
    },
    borrowGivenPercentParams: {
      assetOut: 1n,
      percent: 0x70000000n,
      maxDebt: 2000n,
      maxCollateral: 1000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 1000000n,
      debtIn: 1200000n,
      collateralIn: 100000n,
    },
    borrowGivenPercentParams: {
      assetOut: 1n,
      percent: 0x00000000n,
      maxDebt: 2000n,
      maxCollateral: 1000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 1000000n,
      debtIn: 1200000n,
      collateralIn: 100000n,
    },
    borrowGivenPercentParams: {
      assetOut: 500000n,
      percent: 0x00000000n,
      maxDebt: 2000000n,
      maxCollateral: 1000000n,
    },
  },
];
export default testcases;

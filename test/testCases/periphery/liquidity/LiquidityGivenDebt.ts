const testcases = [
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    liquidityGivenDebtParams: {
      debtIn: 10000n,
      minLiquidity: 1000n,
      maxAsset: 15000n,
      maxCollateral: 2000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    liquidityGivenDebtParams: {
      debtIn: 100000n,
      minLiquidity: 10000n,
      maxAsset: 150000n,
      maxCollateral: 20000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 100000000000000000000000n,
      debtIn: 120000000000000000000000n,
      collateralIn: 10000000000000000000000n,
    },
    liquidityGivenDebtParams: {
      debtIn: 100000000000000000000000n,
      minLiquidity: 10000000000000000000000n,
      maxAsset: 150000000000000000000000n,
      maxCollateral: 20000000000000000000000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 100000000000000000000000n,
      debtIn: 120000000000000000000000n,
      collateralIn: 10000000000000000000000n,
    },
    liquidityGivenDebtParams: {
      debtIn: 1000000000000000000000000n,
      minLiquidity: 100000000000000000000000n,
      maxAsset: 1500000000000000000000000n,
      maxCollateral: 200000000000000000000000n,
    },
  },
];
export default testcases;

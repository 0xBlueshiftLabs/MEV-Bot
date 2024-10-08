const testcases = [
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    liquidityGivenCollateralParams: {
      collateralIn: 999n,
      minLiquidity: 100n,
      maxDebt: 13000n,
      maxAsset: 13000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    liquidityGivenCollateralParams: {
      collateralIn: 1299n,
      minLiquidity: 120n,
      maxDebt: 16000n,
      maxAsset: 16000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000000000000000000000n,
      debtIn: 12000000000000000000000n,
      collateralIn: 1000000000000000000000n,
    },
    liquidityGivenCollateralParams: {
      collateralIn: 999000000000000000000n,
      minLiquidity: 100000000000000000000n,
      maxDebt: 13000000000000000000000n,
      maxAsset: 13000000000000000000000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000000000000000000000n,
      debtIn: 12000000000000000000000n,
      collateralIn: 1000000000000000000000n,
    },
    liquidityGivenCollateralParams: {
      collateralIn: 1299000000000000000000n,
      minLiquidity: 120000000000000000000n,
      maxDebt: 16000000000000000000000n,
      maxAsset: 16000000000000000000000n,
    },
  },
];

export default testcases;

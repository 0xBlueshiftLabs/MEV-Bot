const testcases = [
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    liquidityGivenAssetParams: {
      assetIn: 10000n,
      minLiquidity: 5700000n,
      maxDebt: 12000n,
      maxCollateral: 10000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000000000000000000000n,
      debtIn: 12000000000000000000000n,
      collateralIn: 1000000000000000000000n,
    },
    liquidityGivenAssetParams: {
      assetIn: 1000000000000000000000n,
      minLiquidity: 5700000000000000000000000n,
      maxDebt: 12000000000000000000000n,
      maxCollateral: 10000000000000000000000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    liquidityGivenAssetParams: {
      assetIn: 12000n,
      minLiquidity: 5700000n,
      maxDebt: 15000n,
      maxCollateral: 13000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000000000000000000000n,
      debtIn: 12000000000000000000000n,
      collateralIn: 1000000000000000000000n,
    },
    liquidityGivenAssetParams: {
      assetIn: 12000000000000000000000n,
      minLiquidity: 5700000000000000000000000n,
      maxDebt: 15000000000000000000000n,
      maxCollateral: 13000000000000000000000n,
    },
  },
];

export default testcases;

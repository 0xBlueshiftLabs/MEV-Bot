const testCases = [
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    lendGivenLoanParams: {
      assetIn: 1000n,
      loanOut: 1010n,
      minCoverage: 50n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    lendGivenLoanParams: {
      assetIn: 1000n,
      loanOut: 1087n,
      minCoverage: 50n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 1000n,
    },
    lendGivenLoanParams: {
      assetIn: 500n,
      loanOut: 591n,
      minCoverage: 20n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 990n,
    },
    lendGivenLoanParams: {
      assetIn: 1000n,
      loanOut: 1010n,
      minCoverage: 50n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000n,
      debtIn: 12000n,
      collateralIn: 990n,
    },
    lendGivenLoanParams: {
      assetIn: 100n,
      loanOut: 110n,
      minCoverage: 2n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000000000000000000000n,
      debtIn: 12000000000000000000000n,
      collateralIn: 1000000000000000000000n,
    },
    lendGivenLoanParams: {
      assetIn: 1000000000000000000000n,
      loanOut: 1010000000000000000000n,
      minCoverage: 50000000000000000000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000000000000000000000n,
      debtIn: 12000000000000000000000n,
      collateralIn: 1000000000000000000000n,
    },
    lendGivenLoanParams: {
      assetIn: 1000000000000000000000n,
      loanOut: 1087000000000000000000n,
      minCoverage: 50000000000000000000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000000000000000000000n,
      debtIn: 12000000000000000000000n,
      collateralIn: 1000000000000000000000n,
    },
    lendGivenLoanParams: {
      assetIn: 500000000000000000000n,
      loanOut: 591000000000000000000n,
      minCoverage: 20000000000000000000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000000000000000000000n,
      debtIn: 12000000000000000000000n,
      collateralIn: 990000000000000000000n,
    },
    lendGivenLoanParams: {
      assetIn: 1000000000000000000000n,
      loanOut: 1010000000000000000000n,
      minCoverage: 50000000000000000000n,
    },
  },
  {
    newLiquidityParams: {
      assetIn: 10000000000000000000000n,
      debtIn: 12000000000000000000000n,
      collateralIn: 990000000000000000000n,
    },
    lendGivenLoanParams: {
      assetIn: 100000000000000000000n,
      loanOut: 110000000000000000000n,
      minCoverage: 2000000000000000000n,
    },
  },
];

export default testCases;

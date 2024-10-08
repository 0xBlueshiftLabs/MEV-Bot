export interface LendGivenLoanParams {
  assetIn: bigint;
  loanOut: bigint;
  minCoverage: bigint;
}
export interface LendGivenCoverageParams {
  assetIn: bigint;
  coverageOut: bigint;
  minLoan: bigint;
}
export interface LendGivenPercentParams {
  assetIn: bigint;
  percent: bigint;
  minCoverage: bigint;
  minLoan: bigint;
}

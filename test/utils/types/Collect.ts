export interface Claims {
  loanInterest: bigint;
  loanPrincipal: bigint;
  coverageInterest: bigint;
  coveragePrincipal: bigint;
}
export interface CollectParams {
  claims: Claims;
}

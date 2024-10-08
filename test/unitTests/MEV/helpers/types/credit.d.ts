//import BigNumber from "bignumber.js";
import { BigNumber } from "ethers";

// export type Token = {
//   address: string;
//   symbol: string;
//   name: string;
//   decimals: number;
//   logoURI?: string;
// };

export enum PositionType {
  LIQUIDITY,
  CREDIT,
  DEBT,
  FARM,
}

export type CreditPosition = {
  positionType: PositionType;
  pair: string;
  maturity: number;
  CDT?: CreditToken;
  liquidityToken?: CreditToken;
  loanPrincipal?: CreditToken;
  loanInterest?: CreditToken;
  coveragePrincipal?: CreditToken;
  coverageInterest?: CreditToken;
  positionIndex: string;
};

export type CreditedPool = {
  loanInterestBalance: BigNumber;
  loanPrincipalBalance: BigNumber;
  coverageInterestBalance: BigNumber;
  coveragePrincipalBalance: BigNumber;
  position: CreditPosition;
};

export type Position = {
  maxAPR: BigNumber;
  liquidityBalance?: BigNumber;
  loanInterestBalance?: BigNumber;
  loanPrincipalBalance?: BigNumber;
  coverageInterestBalance?: BigNumber;
  coveragePrincipalBalance?: BigNumber;
  lockedDebtBalance?: BigNumber;
  maturation;
  matured;
  maturity;
  asset;
};

export type Due = {
  debt: BigNumber;
  collateral: BigNumber;
  positionId?: number;
  position?: CreditPosition;
};

export type CreditProduct = "lend" | "borrow" | "repay" | "claim";

export type CP = {
  x: BigNumber;
  y: BigNumber;
  z: BigNumber;
};

export interface Claims {
  loanPrincipal: BigNumber;
  loanInterest: BigNumber;
  coveragePrincipal: BigNumber;
  coverageInterest: BigNumber;
}

export enum TokenType {
  BOND_PRINCIPAL,
  BOND_INTEREST,
  INSURANCE_PRINCIPAL,
  INSURANCE_INTEREST,
  LIQUIDITY,
  COLLATERAL_DEBT,
}

export type CreditToken = {
  assetContract: string;
  tokenId: string;
  totalAmount: number;
  tokenType: TokenType;
};

export type UserInfo = {
  creditPositionIds: number[]; // The ids of the credit position
  amount: BigNumber; // How many LP tokens the user has provided
  rewardDebt: BigNumber; // The amount of CREDIT entitled to the user
};

export type PoolInfo = {
  allocPoint: BigNumber; // How many allocation points assigned to this pool. CREDIT to distribute per block
  lastRewardTime: BigNumber; // Last block number that CREDIT distribution occurs
  accCreditPerShare: BigNumber; // Accumulated CREDIT per share, times 1e12
  maturity: number; // The maturity of the pool
  lpSupply: BigNumber; // The total amount of LP tokens farmed
};

export const DYEAR = 31556926;

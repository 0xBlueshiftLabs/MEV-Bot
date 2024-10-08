import ethers from "ethers";
import BorrowMath from "../librariesCore/BorrowMath";
import BurnMath from "../librariesCore/BurnMath";
import LendMath from "../librariesCore/LendMath";
import MintMath from "../librariesCore/MintMath";
import WithdrawMath from "../librariesCore/WithdrawMath";
import {
  Due,
  dueDefault,
  Factory,
  initFactory,
  Pool,
  poolDefault,
  Tokens,
  tokensDefault,
  TotalClaims,
  totalClaimsDefault,
} from "./PairInterface";

const ZERO_ADDRESSS = "0x0000000000000000000000000000000000000000";
export class PairSim {
  public asset: string;
  public collateral: string;
  public protocolFee: bigint;
  public stakingFee: bigint;
  public lpFee: bigint;
  public protocolFeeStored: bigint;
  public stakingFeeStored: bigint;
  public pools: Pool[];
  public contractAddress: string;
  public factory: Factory;

  constructor(
    asset: string,
    collateral: string,
    lpFee: bigint,
    protocolFee: bigint,
    stakingFee: bigint,
    contractAddress: string,
    factoryAddress: string,
    owner: string
  ) {
    this.asset = asset;
    this.collateral = collateral;
    this.lpFee = lpFee;
    this.protocolFee = protocolFee;
    this.stakingFee = stakingFee;
    this.protocolFeeStored = 0n;
    this.stakingFeeStored = 0n;
    this.pools = [];
    this.contractAddress = contractAddress;
    this.factory = initFactory(factoryAddress, owner);
  }

  lpFeeStored(pool: Pool) {
    return pool.state.lpFeeStored;
  }

  getPool(maturity: bigint): Pool {
    let pool = this.pools.find((x) => x.maturity == maturity);
    if (pool == undefined) {
      pool = poolDefault(maturity);
    }
    return pool;
  }

  getLiquidity(pool: Pool, liquidityProvider: string) {
    const liquidity = pool.liquidities.find((x) => x.liquidityProvider == liquidityProvider);
    if (liquidity == undefined) {
      return -1n;
    } else return liquidity.liquidity;
  }

  getClaims(pool: Pool, lender: string) {
    const claims = pool.claims.find((x) => x.lender == lender);
    if (claims == undefined) {
      return totalClaimsDefault();
    } else return claims.claims;
  }

  getDues(pool: Pool, borrower: string) {
    let dues = pool.dues.find((due) => due.borrower == borrower);
    if (dues == undefined) {
      dues = { borrower: borrower, due: [] };
    }
    return dues;
  }

  getTotalDues(pool: Pool) {
    let dues = pool.dues;
    return dues;
  }

  addLiquidity(pool: Pool, liquidity: bigint, liquidityProvider: string) {
    const maybeLiquidity = pool.liquidities.find((x) => x.liquidityProvider == liquidityProvider);
    if (maybeLiquidity != undefined) {
      maybeLiquidity.liquidity += liquidity;
    } else {
      pool.liquidities.push({ liquidityProvider: liquidityProvider, liquidity: liquidity });
    }
    return pool;
  }
  removeLiquidity(pool: Pool, liquidity: bigint, liquidityProvider: string) {
    const maybeLiquidity = pool.liquidities.find((x) => x.liquidityProvider == liquidityProvider);
    if (maybeLiquidity != undefined) {
      maybeLiquidity.liquidity -= liquidity;
    }
    return pool;
  }

  addDue(pool: Pool, due: Due[], dueTo: string) {
    const dues = pool.dues.find((due) => due.borrower == dueTo);
    if (dues != undefined) {
      dues.due = due;
    } else {
      pool.dues.push({ borrower: dueTo, due: due });
    }
  }

  removeDue(pool: Pool, due: Due, dueTo: string) {
    const dues = pool.dues.find((due) => due.borrower == dueTo);
    if (dues != undefined) {
      dues.due = dues.due.filter((x) => x != due);
    }
  }
  addClaim(pool: Pool, claim: TotalClaims, lender: string) {
    const maybeClaim = pool.claims.find((x) => x.lender == lender);
    if (maybeClaim != undefined) {
      maybeClaim.claims.loanPrincipal += claim.loanPrincipal;
      maybeClaim.claims.loanInterest += claim.loanInterest;
      maybeClaim.claims.coveragePrincipal += claim.coveragePrincipal;
      maybeClaim.claims.coverageInterest += claim.coverageInterest;
    } else {
      pool.claims.push({ lender: lender, claims: claim });
    }
    return pool;
  }
  removeClaim(pool: Pool, claim: TotalClaims, lender: string) {
    const maybeClaim = pool.claims.find((x) => x.lender == lender);
    if (maybeClaim != undefined) {
      maybeClaim.claims.loanPrincipal -= claim.loanPrincipal;
      maybeClaim.claims.loanInterest -= claim.loanInterest;
      maybeClaim.claims.coveragePrincipal -= claim.coveragePrincipal;
      maybeClaim.claims.coverageInterest -= claim.coverageInterest;
    }
    return pool;
  }

  mint(
    maturity: bigint,
    liquidityTo: string,
    dueTo: string,
    assetIn: bigint,
    interestIncrease: bigint,
    cdpIncrease: bigint,
    block: ethers.providers.Block
  ):
    | {
        liquidityOut: bigint;
        id: bigint;
        dueOut: Due;
      }
    | string {
    const now = BigInt(block.timestamp);
    const blockNumber = BigInt(block.number);

    if (!(now < maturity)) return "Expired";
    if (!(liquidityTo != ZERO_ADDRESSS && dueTo != ZERO_ADDRESSS)) return "Zero";
    if (!(liquidityTo != this.contractAddress && dueTo != this.contractAddress)) return "Invalid";
    if (!(interestIncrease > 0 && cdpIncrease > 0)) return "Invalid";
    if (!(assetIn > 0)) return "Invalid";

    let pool = this.getPool(maturity);

    let liquidityOut: bigint;

    if (pool.state.totalLiquidity == 0n) {
      liquidityOut = MintMath.getLiquidity1(assetIn);
    } else {
      const _liquidityOut = MintMath.getLiquidity2(pool.state, assetIn, interestIncrease, cdpIncrease);
      if (typeof _liquidityOut == "string") {
        return "Invalid";
      } else {
        liquidityOut = _liquidityOut;
      }
    }
    const feeStoredIncrease = MintMath.getFee(pool.state, liquidityOut);

    if (!(liquidityOut > 0)) return "Invalid";

    pool = this.addLiquidity(pool, liquidityOut, liquidityTo);
    pool.state.totalLiquidity += liquidityOut;
    pool.state.lpFeeStored += feeStoredIncrease;

    let dueOut = dueDefault();

    dueOut.debt = MintMath.getDebt(maturity, assetIn, interestIncrease, now);
    dueOut.collateral = MintMath.getCollateral(maturity, assetIn, interestIncrease, cdpIncrease, now);
    dueOut.startBlock = blockNumber;

    const id = BigInt(pool.dues.length);
    pool.state.reserves.asset += assetIn;
    pool.state.reserves.collateral += dueOut.collateral;
    pool.state.asset += assetIn;
    pool.state.interest += interestIncrease;
    pool.state.cdp += cdpIncrease;

    this.pools.push(pool);
    return {
      liquidityOut: liquidityOut,
      id: id,
      dueOut: dueOut,
    };
  }

  burn(
    maturity: bigint,
    assetTo: string,
    collateralTo: string,
    liquidityIn: bigint,
    sender: string,
    block: ethers.providers.Block
  ): Tokens | string {
    const now = BigInt(block.timestamp);

    if (now < maturity) return "Active";
    if (!(assetTo != ZERO_ADDRESSS && collateralTo != ZERO_ADDRESSS)) return "Zero";
    if (!(assetTo != this.contractAddress && collateralTo != this.contractAddress)) return "Invalid";
    if (liquidityIn <= 0) return "Invalid";

    let pool = this.getPool(maturity);

    let tokensOut = tokensDefault();
    let feeOut;

    tokensOut.asset = BurnMath.getAsset(pool.state, liquidityIn);
    tokensOut.collateral = BurnMath.getCollateral(pool.state, liquidityIn);
    feeOut = BurnMath.getFee(pool.state, liquidityIn);

    pool.state.totalLiquidity -= liquidityIn;

    this.removeLiquidity(pool, liquidityIn, sender);

    if (tokensOut.asset != 0n) {
      pool.state.reserves.asset -= tokensOut.asset;
      pool.state.lpFeeStored -= feeOut;
    }
    if (tokensOut.collateral != 0n) {
      pool.state.reserves.collateral -= tokensOut.collateral;
    }

    return tokensOut;
  }

  lend(
    maturity: bigint,
    loanTo: string,
    coverageTo: string,
    assetIn: bigint,
    interestDecrease: bigint,
    cdpDecrease: bigint,
    block: ethers.providers.Block
  ): TotalClaims | string {
    const now = BigInt(block.timestamp);
    if (now >= maturity) return "Expired";
    if (!(loanTo != ZERO_ADDRESSS && coverageTo != ZERO_ADDRESSS)) {
      return "Zero";
    }
    if (!(loanTo != this.contractAddress && coverageTo != this.contractAddress)) {
      return "Invalid";
    }
    if (assetIn <= 0) {
      return "Invalid";
    }
    if (interestDecrease <= 0 && cdpDecrease <= 0) {
      return "Invalid";
    }

    const pool = this.getPool(maturity);

    if (pool.state.totalLiquidity <= 0) return "Invalid";

    if (!LendMath.check(pool.state, assetIn, interestDecrease, cdpDecrease)) return "lend math check fail";

    const { feeStoredIncrease, protocolFeeStoredIncrease, stakingFeeStoredIncrease } = LendMath.getFees(
      maturity,
      assetIn,
      this.lpFee,
      this.protocolFee,
      this.stakingFee,
      now
    );

    let claimsOut = totalClaimsDefault();
    claimsOut.loanPrincipal = assetIn;
    claimsOut.loanInterest = LendMath.getLoanInterest(maturity, interestDecrease, now);
    claimsOut.coveragePrincipal = LendMath.getCoveragePrincipal(pool.state, assetIn);
    claimsOut.coverageInterest = LendMath.getCoverageInterest(maturity, cdpDecrease, now);

    pool.state.lpFeeStored += feeStoredIncrease;
    this.protocolFeeStored += protocolFeeStoredIncrease;
    this.stakingFeeStored += stakingFeeStoredIncrease;

    pool.state.totalClaims.loanPrincipal += claimsOut.loanPrincipal;
    pool.state.totalClaims.loanInterest += claimsOut.loanInterest;
    pool.state.totalClaims.coveragePrincipal += claimsOut.coveragePrincipal;
    pool.state.totalClaims.coverageInterest += claimsOut.coverageInterest;

    this.addClaim(pool, claimsOut, loanTo);

    pool.state.reserves.asset += assetIn;

    pool.state.asset += assetIn;
    pool.state.interest -= interestDecrease;
    pool.state.cdp -= cdpDecrease;
    return claimsOut;
  }

  withdraw(
    maturity: bigint,
    assetTo: string,
    collateralTo: string,
    claimsIn: TotalClaims,
    sender: string,
    block: ethers.providers.Block
  ): Tokens | string {
    const now = BigInt(block.timestamp);

    if (now < maturity) return "Active";
    if (!(assetTo != ZERO_ADDRESSS && collateralTo != ZERO_ADDRESSS)) return "Zero";
    if (!(assetTo != this.contractAddress || collateralTo != this.contractAddress)) return "Invalid";
    if (
      claimsIn.loanPrincipal <= 0 ||
      claimsIn.loanInterest <= 0 ||
      claimsIn.coveragePrincipal <= 0 ||
      claimsIn.coverageInterest <= 0
    )
      return "Invalid";

    const pool = this.getPool(maturity);
    const tokensOut = WithdrawMath.getTokensOut(pool.state, claimsIn);

    pool.state.totalClaims.loanPrincipal -= claimsIn.loanPrincipal;
    pool.state.totalClaims.loanInterest -= claimsIn.loanInterest;
    pool.state.totalClaims.coveragePrincipal -= claimsIn.coveragePrincipal;
    pool.state.totalClaims.coverageInterest -= claimsIn.coverageInterest;

    this.removeClaim(pool, claimsIn, sender);

    pool.state.reserves.asset -= tokensOut.asset;
    pool.state.reserves.collateral -= tokensOut.collateral;

    return tokensOut;
  }

  borrow(
    maturity: bigint,
    assetTo: string,
    dueTo: string,
    assetOut: bigint,
    interestIncrease: bigint,
    cdpIncrease: bigint,
    block: ethers.providers.Block
  ): { id: bigint; dueOut: Due } | string {
    const now = BigInt(block.timestamp);
    const blockNumber = BigInt(block.number);

    if (now >= maturity) return "Expired";
    if (!(assetTo != ZERO_ADDRESSS && dueTo != ZERO_ADDRESSS)) return "Zero";
    if (!(assetTo != this.contractAddress && dueTo != this.contractAddress)) return "Invalid";
    if (assetOut <= 0) return "Invalid";
    if (interestIncrease <= 0 && cdpIncrease <= 0) return "Invalid";
    const pool = this.getPool(maturity);

    if (pool.state.totalLiquidity <= 0) return "Invalid";
    if (!BorrowMath.check(pool.state, assetOut, interestIncrease, cdpIncrease)) return "constant product check";
    let dueOut = dueDefault();

    dueOut.debt = BorrowMath.getDebt(maturity, assetOut, interestIncrease, now);
    dueOut.collateral = BorrowMath.getCollateral(maturity, pool.state, assetOut, cdpIncrease, now);
    const { feeStoredIncrease, protocolFeeStoredIncrease, stakingFeeStoredIncrease } = BorrowMath.getFees(
      maturity,
      assetOut,
      this.lpFee,
      this.protocolFee,
      this.stakingFee,
      now
    );
    pool.state.lpFeeStored += feeStoredIncrease;
    this.protocolFeeStored += protocolFeeStoredIncrease;
    this.stakingFeeStored += stakingFeeStoredIncrease;

    dueOut.startBlock = blockNumber;

    const dues = this.getDues(pool, dueTo);
    const id = BigInt(pool.dues.length);
    dues.due.push(dueOut);
    this.addDue(pool, dues.due, dueTo);

    pool.state.reserves.asset -= assetOut;
    pool.state.reserves.collateral += dueOut.collateral;
    pool.state.totalDebtCreated += dueOut.debt;
    pool.state.asset -= assetOut;
    pool.state.interest += interestIncrease;
    pool.state.cdp += cdpIncrease;
    return { id: id, dueOut: dueOut };
  }

  pay(
    maturity: bigint,
    to: string,
    owner: string,
    id: bigint,
    debtIn: bigint,
    collateralOut: bigint,
    sender: string,
    block: ethers.providers.Block
  ): bigint | string {
    const now = BigInt(block.timestamp);
    const blockNumber = BigInt(block.number);

    if (!(now < maturity)) return "Expired";
    if (!(to != ZERO_ADDRESSS)) return "Zero";
    if (!(to != this.contractAddress)) return "Invalid";

    const pool = this.getPool(maturity);

    const dues = this.getDues(pool, sender).due;
    const due = dues[Number(id)];

    if (!(due.startBlock != blockNumber)) return "Invalid";
    if (!(debtIn > 0)) return "Invalid";

    if (!(debtIn * due.collateral == collateralOut * due.debt)) {
      return collateralOut;
    }

    due.debt -= debtIn;
    due.collateral -= collateralOut;

    pool.state.reserves.asset += debtIn;
    pool.state.reserves.collateral -= collateralOut;

    return collateralOut;
  }
}

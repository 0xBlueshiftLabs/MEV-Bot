# Undercollateralized Lending/Borrowing MEV Bot


Arbitraging undercollateralized Timeswap-V1-based pools with Uniswap flash loans.


Flow:
1.	Identify undercollateralized pool (i.e. CDP < 100%). For example: WETH/USDC.
2.	Use a flash loan to borrow the collateral token of pool (USDC), deposit it as collateral on Credit protocol at the low CDP (meaning you can borrow more per unit of collateral), and borrow the pool’s asset token (WETH).
3.	Swap asset token to collateral token (WETH → USDC).
4.	Repay flash loan.
5.	Default on the borrow position.
6.	Profit.

<p align="center">
  <img width="600" height="330" src="/MEV-flow.png">
</p>


## Identifying undercollateralized pools

When users borrow from or lend to a pool a Borrow or Lend event is emitted. Listening for these events we can trigger a call to the pair contract to check the X and Z values of the constant product formula using the constantProduct() getter method.

Undercollateralized pools are typically caused by a lender depositing too much compared to the size of the pool, which drastically decreases the value of Z.
An undercollateralized pool is given by the formula Z/X < 1 where Z and X are the $ value of the collateral and the asset (or Z is the corresponding amount of X value).



Example:

•	Pool DAI/ETH where 1ETH = 1500 DAI.

•	X=20,000 DAI and Z = 10 ETH

•	CDP = Z/X. 10*1500/20000 = 0.75 (=75%). This pool is undercollateralized.



When users borrow from or lend to a pool a Borrow or Lend event is emitted. Listening for these events we can trigger a call to the pair contract to check the X and Z values of the constant product formula using the constantProduct() getter method.


If Z/X < 1 then the pool is undercollateralized and a profitable arbitrage opportunity may be possible.

## Targeting Specific CDPs
Potential for a pure math solution, implemented on-chain.
For now, off-chain algorithm used. Looping `BorrowMath.givenPercent()` whilst varying the `assetOut` argument to get the changes in `x, y, z` values of the pool and therefore the new CDP of the pool. 
This will determine the optimal amount of asset token to borrow from the credit pool, from which we can calculate the amount of collateral token to flash loan from Uniswap.

A binary search algorithm seemed appropriate for this as average performance is O(log n).



## Minimising Fees


With the need to use separate Uniswap pools for flashing and swapping (in order to avoid a re-entrancy revert), there are 3 options when it comes to determining which pools to use.


### WETH default
As every token on Uniswap has a WETH pair, the MEV smart contract could use WETH as the counter token for each swap. 
Example:

Undercollateralized Credit pair: ARB-USDC
1.	Flash borrow USDC from WETH/USDC pool on Uniswap (0.3% fee).
2.	Deposit USDC on Credit protocol, borrowing ARB.
3.	Swap ARB to USDC using ARB-USDC pool on Uniswap (0.3% fee).
4.	Repay USDC flash loan.


However, we would encounter issues if the collateral token of the undercollateralized Credit pair was WETH. 


### Hardcoding pool data


By mapping Credit pair addresses to Uniswap pool data within the MEV smart contract, we can control the pools used when arbitraging an undercollateralized credit pool.


Note: the swap pool will always be the same assets as the credit pair.


`struct RouteData {
	address flashPoolCounterToken;
	uint24 flashPoolFee;
	uint24 swapPoolFee;
}`


When deploying a new Credit pair, the deployment script could include a call to the MEV smart contract to set up and store the flash and swap pools to be used in the case of an arbitrage opportunity.
Hardcoding the pool data also means we can take advantage of the reduced fees of stable pools whilst also reducing slippage by only using pools with deep liquidity.

Example:

Undercollateralized Credit pair: ARB-USDC

1.	Flash borrow USDC from USDT/USDC pool on Uniswap (0.05% fee).
2.	Deposit USDC on Credit protocol, borrowing ARB.
3.	Swap ARB to USDC using ARB-USDC pool on Uniswap (0.3% fee).
4.	Repay USDC flash loan.

This saves 0.25% on fees compared to the WETH default case, increasing the bot’s profitability.
Further fee reduction could be achieved by keeping a balance of tokens for use rather than requiring a flash loan (could also potentially negate the need for a swap). This, however, would require further development and testing whilst also increasing the risk of vulnerabilities.

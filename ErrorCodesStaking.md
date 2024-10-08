# Error Codes

Documents all the Error Codes in Credit-protocol staking.

## `CreditStaking.sol`

### E1301

Address Zero error.

The address (or the address of the ERC20 token) passed is 0.

Can occur in `initialize`.

Check the address passed, and verify if it is not 0.

### E1302

Invalid unstaking penalties.

Can occur in `initialize` and `setUnstakingPenalties`.

### E1303

initialize: invalid cycle duration.

### E1304

Modifier: `validateDistributedTokensIndex`

Index does not exist.

### E1305

Modifier: `validateDistributedToken`

Token does not exists.

### E1306

Modifier: `isDistributorOrOwner`

Caller is not the owner or distributor.

Check msg.sender.

### E1307

Receive: caller must be WETH.

### E1308

setDistributor: address cannot be zero.

### E1309

harvestDividends: invalid token.

### E1310

emergencyWithdraw: token balance is zero.

### E1311

enableDistributedToken: already enabled dividends token.

### E1312

enableDistributedToken: too many distributedTokens.

### E1313

enableDistributedToken: already disabled dividends token.

### E1314

removeTokenFromDistributedTokens: token cannot be removed.

### E1315

\_safeTokenTransfer: not receipt token.

### E1316

\_safeTokenTransfer: ETH_TRANSFER_FAILED.

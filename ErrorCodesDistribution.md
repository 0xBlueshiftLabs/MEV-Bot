# Error Codes

Documents all the Error Codes in Credit-protocol distribution.

## `Claimer.sol`

### E801

Modifier `isAdminOrOwner` failed.

Caller is not the owner of the contract, or an admin. Check the msg.sender.

Methods with this restricted access include `setRoot`, `setLockingDecisionCutOff`, `setUnstakeStatuses`, `stake`, `reducedCliffUnstake` & `standardCliffUnstake`.

### E802

Address Zero error.

The address (or the address of the ERC20 token) passed is 0.

Can occur in `initialize`.

Check the address passed, and verify if it is not 0.

### E803

Launch share already claimed by user. Cannot now lock.

Occurs in `lockLaunchShare`.

### E804

Launch share already locked by user.

Occurs in `lockLaunchShare`.

### E805

Can no longer lock launch share. Outside of decision window.

Occurs in `lockLaunchShare`.

### E806

User never locked launch share. Therefore nothing to unlock.

Occurs in `unlockLaunchShare`.

### E807

Admin/owner is yet to unstake user tokens. As such, user is unable to unlock their launch share.

Occurs in `unlockLaunchShare`.

### E808

Address of Credit token or CreditStaking contract is yet to be set using `initialize`.

Occurs in `stake`.

### E809

Admin is unable to stake tokens on behalf of users before the lock decision cut off.

Occurs in `stake`.

### E810

Total vesting duration cannot equal zero.

Check value of `_totalReducedVestingDuration` & `_totalStandardVestingDuration` passed to `stake`.

### E811

`_standardCliffDuration` must be greater than `_reducedCliffDuration`.

### E812

Standard vesting duration must be greater than reduced.

Check values of `_totalReducedVestingDuration` & `_totalStandardVestingDuration` passed to `stake`.

### E813

`_totalReducedVestingDuration` must be greater than `_reducedCliffDuration`.

Cliff period cannot be greater than the total vesting duration.

Check values of `_totalReducedVestingDuration` & `_reducedCliffDuration` passed to `stake`.

### E814

`_totalStandardVestingDuration` must be greater than `_standardCliffDuration`.

Cliff period cannot be greater than the total vesting duration.

Check values of `_totalStandardVestingDuration` & `_standardCliffDuration` passed to `stake`.

### E815

Admin or owner cannot unstake before reduced or standard cliff period has elapsed.

Occurs in `reducedCliffUnstake` & `standardCliffUnstake`.

### E816

Unstaking at current moment would incur a penalty. As such, admin/owner is unable to unstake tokens on user's behalf.

## `Distributor.sol`

### E901

Modifier `isAdminOrOwner` failed.

Caller is not the owner of the contract, or an admin. Check the msg.sender.

### E902

Address Zero error.

The address (or the address of the ERC20 token) passed is 0.

Can occur in `initialize`.

Check the address passed, and verify if it is not 0.

### E903

`_treasuryTotalAmount` must be greater or equal to `_treasuryVestedAmount`.

Occurs in `initialize`.

### E904

`_ratioUpper` must be greater than `_ratioLower`.

Occurs in `setEmissionRateParams`.

### E905

`_ratioUpper` must be <= 1e18.

Occurs in `setEmissionRateParams`.

### E906

`_emissionRateUpper` must be greater than `_emissionRateLower`

Occurs in `setEmissionRateParams`.

### E907

Method only callable by lpFarming contract.

Occurs in `claimFarmingCredit`.

### E908

Call to multiswap failed.

Occurs in `swap`.

### E909

Array size mismatch. Ensure lengths of `_tokens` and `_amounts` are equal.

Occurs in `sendToStaking`.

### E910

Insufficient token balance.

Ensure contract has sufficient balance of CREDIT token before calling method.

Credit token balance must be greater or equal to auctionAmount + airdropAmount + teamAllocationAmount + treasuryTotalAmount.

Occurs in `distribute`.

## `TeamAllocator.sol`

### E1001

Address Zero error.

The address (or the address of the ERC20 token) passed is 0.

Can occur in `initialize` or `stakeTeamAllocation` if `initialize` has not yet been called.

Check the address passed, and verify if it is not 0.

### E1002

Individual allocations sum differs to totalTeamAllocation. Check `_teamAllocations`.

Occurs in `unstakeAndVestTeamAllocation`.

### E1003

Array size mismatch. Ensure lengths of `_teamAddresses` and `_teamAllocations` are equal.

Occurs in `unstakeAndVestTeamAllocation`.

### E1004

Cliff duration yet to elapse. Method only callable after `cliffEnd`.

Occurs in `unstakeAndVestTeamAllocation`.

### E1005

Unstaking at current moment would incur a penalty. As such, owner is unable to unstake tokens on team's behalf.

Occurs in `unstakeAndVestTeamAllocation`.

### E1006

Team members unable to claim tokens before owner has unstaked tokens on their behalf.

Occurs in `claim`.

### E1007

Team member has already claimed their tokens.

Occurs in `claim`.

### E1008

Team member has no allocation and therefore nothing to claim.

Occurs in `claim`.

## `Vesting.sol`

### E1101

Address Zero error.

The address (or the address of the ERC20 token) passed is 0.

Can occur in `construtor` or `vestTokens`.

Check the address passed, and verify if it is not 0.

### E1102

Beneficiary already exists.

Occurs in `vestTokens`.

### E1103

Invalid allocation. Allocation must be greater than 0.

Occurs in `vestTokens`.

### E1104

Invalid start. Start timestamp must be in the future.

Occurs in `vestTokens`.

### E1105

Invalid duration. Duration must be greater than 0.

Occurs in `vestTokens`.

### E1106

Invalid cliff. Duration must be greater than cliff.

Occurs in `vestTokens`.

### E1107

Beneficiary doesn't exist. Nothing to revoke.

Occurs in `revoke`.

### E1108

All tokens have already been unlocked. Nothing to revoke.

Occurs in `revoke`.

### E1109

No releasable tokens.

Occurs in `release`.

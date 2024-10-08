# Error Codes

Documents all the Error Codes in credit-protocol periphery.

## Contracts

### E401

The callback should be from pair.

### E402

The callback should be from Locked Debt Token.

### E403

Only router contract can call the function.

### E404

TokenURI doesn't exist.

### E405

Invalid initializer address

### E406

Caller does not have the required role

### E407

Token Id not existing

### E408

Caller not approved for unwrapping this token id

### E409

Not the correct position type

## Libraries

### E501

Pair doesn't exist.

### E502

Receipts don't exist for that pair and maturity.

### E503

Receipts exist for that pair and maturity.

### E504

Current timestamp is after deadline.

### E505

Percent is out of range.

Percent variable is supposed to be between 0 and 2^32 both inclusive.

### E506

New liquidity can only be call to initialize a new pool.

### E507

Add liquidity can only be called to an already initialized pool.

### E508

Maturity is less that current Timestamp.

### E511

Liquidity is less than min Liquidity.

### E512

Debt is greater than max Debt.

### E513

Collateral is greater than max Collateral.

### E514

Loan is less than min Loan.

### E515

Coverage is less than min Coverage.

### E516

Debt In is less than or equal to Asset In.

### E517

Loan Out is less than or equal to Asset In.

### E518

Debt In is less than or equal to Asset Out.

### E519

Asset In is greater than max Asset.

### E520

Ids length and maxAssetsIn length do not match.

### E521

ETH transfer failed

### E522

No token to bind

### E523

CP ID already exists

### E524

Incompatible CP and operation

## Base

### E601

`to` is null Address.

### E602

Current timestamp is after the deadline

### E603

Signer is not the owner

### E604

ERC721 already minted

### E605

Approval to the current owner

### E606

Signer should be a valid address

### E607

Cannot approve to the caller

### E608

Not safe transfer

### E609

Approve caller is not owner nor approved for all

### E610

Transfer to non ERC721Receiver implementer

### E611

Not approved to transfer

### E612

Factory address should not be the weth address

### E613

`owner` is null address

### E614

Token does not exist

### E615

Can only receive ETH from WETH contract

## Callback

### E701

Invalid Sender

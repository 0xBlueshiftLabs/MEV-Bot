# Error Codes

Documents all the Error Codes in Credit-protocol farming.

## `LPFarming.sol`

### E1201

Cannot initialize whilst Credit token address is zero.

### E1202

Cannot set distributor address to zero address.

### E1203

Cannot set credit position address to zero address.

### E1204

addPool: Maturity cannot be in the past.

### E1205

addPool: pair and maturity combination already exists.

### E1206

Pool is not active.
Can occur in `markPoolInactive` & `deposit`.

### E1207

markPoolInactive: pool is yet to mature.

### E1208

deposit: amount is zero.

### E1209

\_withdraw: credit position is not staked.

### E1210

\_withdraw: amount is greater than user amount.

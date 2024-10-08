// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "../staking/interfaces/ICreditStaking.sol";
import "./interfaces/IClaimer.sol";

/// @title Claimer
/// @dev Allows users to stake/unstake launch shares and claim vested Credit tokens.
contract Claimer is IClaimer, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    uint256 public override totalClaimed;
    uint256 public vestingStart;
    uint256 public standardVestingEnd;
    uint256 public reducedVestingEnd;
    uint256 public reducedCliffDuration;
    uint256 public standardCliffDuration;
    uint256 public totalLaunchShareLocked;
    uint256 public lockingDecisionCutOff;
    uint256 public totalContractAllocation;

    bytes32 public merkleRoot;

    bool public unstakedReducedCliffAmount;
    bool public unstakedStandardCliffAmount;

    address public admin;
    address public treasury;

    IERC20 public creditToken;
    ICreditStaking public creditStaking;

    address[] public rewardTokens;

    struct Info {
        bool claimedLaunchShare;
        uint vestingAmountClaimed;
        uint amountLocked;
        uint lockingTimestamp;
    }

    mapping(address => Info) public info;
    mapping(address => uint256) public lockerRewards;

    event Lock(address indexed locker, uint256 amount);
    event Unlock(address indexed unlocker, uint256 amount);
    event Claim(address indexed claimant, uint256 amount);

    error NothingToClaim(); // Already claimed rewards for creditToken
    error InvalidProof(); // Proof provided does not corespond to address

    modifier isAdminOrOwner() {
        require(msg.sender == owner() || (msg.sender == admin && admin != address(0)), "E801");
        _;
    }

    /// @param _merkleRoot Root of merkle tree.
    /// @param _creditToken Credit token address.
    /// @param _creditStaking Address of CreditStaking contract.
    /// @param _treasury Address of treasury.
    /// @param _totalContractAllocation Total amount of Credit allocated to this contract.
    function initialize(
        bytes32 _merkleRoot,
        address _creditToken,
        address _creditStaking,
        address _treasury,
        uint256 _totalContractAllocation
    ) public initializer {
        require(_creditToken != address(0), "E802");
        require(_creditStaking != address(0), "E802");
        require(_treasury != address(0), "E802");

        __Ownable_init();
        __ReentrancyGuard_init();

        merkleRoot = _merkleRoot;
        creditToken = IERC20(_creditToken);
        creditStaking = ICreditStaking(_creditStaking);
        treasury = _treasury;
        totalContractAllocation = _totalContractAllocation;
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address) internal override onlyOwner {}

    // --- USER --- //

    /// @dev Allows user to 'lock' their launch share in return for rewards and reduced cliff/vesting length.
    /// @notice Assumes launch share is half of user's total allocation.
    /// @param _amount Total amount of Credit token allocated to user.
    /// @param _proof Merkle proof.
    function lockLaunchShare(uint256 _amount, bytes32[] calldata _proof) external nonReentrant {
        require(!info[msg.sender].claimedLaunchShare, "E803");
        require(info[msg.sender].lockingTimestamp == 0, "E804");
        require(block.timestamp < lockingDecisionCutOff, "E805");

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, _amount))));

        if (!MerkleProof.verify(_proof, merkleRoot, leaf)) revert InvalidProof();

        info[msg.sender].amountLocked = _amount / 2;
        info[msg.sender].lockingTimestamp = block.timestamp;

        totalLaunchShareLocked += _amount / 2;

        emit Lock(msg.sender, _amount / 2);
    }

    /// @dev Allows user to 'unlock' their launch share and receive rewards.
    /// @notice Assumes Credit token is one of the staking reward tokens.
    /// @notice Assumes launch share is half of user's total allocation.
    /// @param _amount Total amount of Credit token allocated to user.
    /// @param _proof Merkle proof.
    function unlockLaunchShare(uint256 _amount, bytes32[] calldata _proof) external nonReentrant {
        require(info[msg.sender].amountLocked > 0, "E806");
        require(unstakedReducedCliffAmount, "E807");

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, _amount))));

        if (!MerkleProof.verify(_proof, merkleRoot, leaf)) revert InvalidProof();

        for (uint i = 0; i < rewardTokens.length; i++) {
            uint amount = (lockerRewards[rewardTokens[i]] * (_amount / 2)) / totalLaunchShareLocked;

            if (rewardTokens[i] == address(creditToken)) {
                amount += _amount / 2; // locked launch share
            }

            IERC20(rewardTokens[i]).safeTransfer(msg.sender, amount);
        }

        // considers any credit lost via untake penalty to be part of circulating supply (as it goes to treasury)
        totalClaimed += info[msg.sender].amountLocked;

        delete info[msg.sender].amountLocked;

        emit Unlock(msg.sender, _amount / 2);
    }

    /// @dev Transfers vested Credit tokens to claimant.
    /// @param _amount Total amount of Credit token allocated to user.
    /// @param _proof Merkle proof.
    function claimCredit(uint256 _amount, bytes32[] calldata _proof) external nonReentrant {
        uint releasableAmount;
        releasableAmount = getReleasableAmount(_amount, msg.sender, _proof);

        if (releasableAmount == 0) revert NothingToClaim();

        // if user has not staked launch share && not already claimed it
        if (info[msg.sender].lockingTimestamp == 0 && !info[msg.sender].claimedLaunchShare) {
            info[msg.sender].claimedLaunchShare = true;
            info[msg.sender].vestingAmountClaimed += (releasableAmount - (_amount / 2)); // removes launch share tokens from being included in vestingAmountClaimed
        } else {
            info[msg.sender].vestingAmountClaimed += releasableAmount;
        }

        totalClaimed += releasableAmount;

        creditToken.safeTransfer(msg.sender, releasableAmount);

        emit Claim(msg.sender, releasableAmount);
    }

    // --- VIEW --- //

    /// @dev Returns amount of vested Credit tokens available to release.
    /// @notice Assumes launch share is half of user's total allocation.
    /// @param _amount Total amount of Credit token allocated to user.
    /// @param _to Address of vested Credit token recipient.
    /// @param _proof Merkle proof.
    function getReleasableAmount(uint256 _amount, address _to, bytes32[] calldata _proof) public view returns (uint) {
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(_to, _amount))));

        if (!MerkleProof.verify(_proof, merkleRoot, leaf)) revert InvalidProof();

        //slither-disable-next-line uninitialized-local
        uint releasableAmount;
        uint cliffDuration;
        uint vestingEnd;
        bool unstakedChecker;

        // if user has staked launch share
        if (info[_to].lockingTimestamp != 0) {
            cliffDuration = reducedCliffDuration;
            vestingEnd = reducedVestingEnd;
            unstakedChecker = unstakedReducedCliffAmount;
        } else {
            // if user yet to claim launch share
            if (!info[_to].claimedLaunchShare) {
                releasableAmount += _amount / 2; // half of claimant's total allocation available at launch
            }
            cliffDuration = standardCliffDuration;
            vestingEnd = standardVestingEnd;
            unstakedChecker = unstakedStandardCliffAmount;
        }

        // guards against case where tx occurs between cliff ending and unstake() being called by admin
        if (unstakedChecker) {
            if (block.timestamp >= vestingEnd && vestingEnd != 0) {
                // if vesting has ended
                releasableAmount += _amount / 2;
            } else if (block.timestamp >= vestingStart + cliffDuration && block.timestamp < vestingEnd) {
                // if post-cliff
                releasableAmount += ((_amount / 2) * (block.timestamp - vestingStart)) / (vestingEnd - vestingStart);
            }

            releasableAmount -= info[_to].vestingAmountClaimed;
        }

        return releasableAmount;
    }

    // --- ADMIN OR OWNER --- //

    /// @dev Sets merkle root.
    /// @notice Only callable by contract owner or admin.
    /// @param _merkleRoot New merkle root of merkle tree.
    function setRoot(bytes32 _merkleRoot) external isAdminOrOwner {
        merkleRoot = _merkleRoot;
    }

    /// @dev Sets lockingDecisionCutOff timestamp.
    /// @notice Only callable by contract owner or admin.
    /// @param _cutOff Timestamp of cut off point after which staking launch share no longer option for users.
    function setLockingDecisionCutOff(uint _cutOff) external isAdminOrOwner {
        lockingDecisionCutOff = _cutOff;
    }

    /// @dev Setter function to control access to unlockLaunchShare() and claimCredit() amounts.
    /// @notice Only callable by contract owner or admin.
    /// @param _unstakedReducedCliffAmount Boolean of whether launch share stakers can start claiming vested tokens.
    /// @param _unstakedStandardCliffAmount Boolean of whether non launch share stakers can start claiming vested tokens.
    function setUnstakeStatuses(
        bool _unstakedReducedCliffAmount,
        bool _unstakedStandardCliffAmount
    ) external isAdminOrOwner {
        unstakedReducedCliffAmount = _unstakedReducedCliffAmount;
        unstakedStandardCliffAmount = _unstakedStandardCliffAmount;
    }

    /// @dev Stakes Credit token in CreditStaking contract.
    /// @notice Only callable by contract owner or admin. To be called after lockingDecisionCutOff.
    /// @param _standardCliffDuration Duration (in seconds) of vesting cliff for launch share stakers.
    /// @param _standardCliffDuration Duration (in seconds) of vesting cliff for non launch share stakers.
    /// @param _totalReducedVestingDuration Duration (in seconds) of total reduced vesting period for launch stakers (including cliff duration).
    /// @param _totalStandardVestingDuration Duration (in seconds) of total standard vesting period for non launch stakers (including cliff duration).
    function stake(
        uint _reducedCliffDuration,
        uint _standardCliffDuration,
        uint _totalReducedVestingDuration,
        uint _totalStandardVestingDuration
    ) public isAdminOrOwner {
        require(address(creditToken) != address(0), "E808");
        require(address(creditStaking) != address(0), "E808");
        require(block.timestamp >= lockingDecisionCutOff, "E809");
        require(_totalReducedVestingDuration > 0, "E810");
        require(_totalStandardVestingDuration > 0, "E810");
        require(_standardCliffDuration > _reducedCliffDuration, "E811");
        require(_totalStandardVestingDuration > _totalReducedVestingDuration, "E812");
        require(_totalReducedVestingDuration > _reducedCliffDuration, "E813");
        require(_totalStandardVestingDuration > _standardCliffDuration, "E814");

        uint amount = totalContractAllocation / 2 + totalLaunchShareLocked;

        //slither-disable-next-line unused-return
        creditToken.approve(address(creditStaking), amount);
        creditStaking.stake(amount);

        info[address(this)].amountLocked = amount;

        vestingStart = block.timestamp;
        reducedVestingEnd = vestingStart + _totalReducedVestingDuration;
        standardVestingEnd = vestingStart + _totalStandardVestingDuration;
        reducedCliffDuration = _reducedCliffDuration;
        standardCliffDuration = _standardCliffDuration;
    }

    /// @dev Unstakes Credit token from CreditStaking contract on behalf of launch share lockers.
    /// @notice Only callable by contract owner or admin after reducedCliffDuration has passed.
    function reducedCliffUnstake() public isAdminOrOwner {
        require(block.timestamp >= vestingStart + reducedCliffDuration, "E815");

        uint amountToUnstake = 2 * totalLaunchShareLocked; // staked lauch share amount + vested amount

        uint balanceBefore = creditToken.balanceOf(address(this));
        creditStaking.unstake(amountToUnstake);
        uint difference = creditToken.balanceOf(address(this)) - balanceBefore;
        require(difference >= amountToUnstake, "E816");

        rewardTokens = creditStaking.distributedTokens();
        //slither-disable-next-line uninitialized-local
        uint[3] memory balancesBeforeHarvest;
        uint256 rewardTokensLength = rewardTokens.length;

        for (uint i = 0; i < rewardTokensLength; i++) {
            balancesBeforeHarvest[i] = IERC20(rewardTokens[i]).balanceOf(address(this));
        }

        creditStaking.harvestAllDividends(false);

        uint[3] memory harvestedRewards;
        for (uint i = 0; i < rewardTokensLength; i++) {
            harvestedRewards[i] = (IERC20(rewardTokens[i]).balanceOf(address(this)) - balancesBeforeHarvest[i]);
            lockerRewards[rewardTokens[i]] =
                (harvestedRewards[i] * (totalLaunchShareLocked)) /
                (info[address(this)].amountLocked);

            IERC20(rewardTokens[i]).safeTransfer(treasury, harvestedRewards[i] - lockerRewards[rewardTokens[i]]); // sending remaining staking rewards to treasury
        }

        info[address(this)].amountLocked -= amountToUnstake;

        unstakedReducedCliffAmount = true;
    }

    /// @dev Unstakes Credit token from CreditStaking contract, sending ALL harvested rewards to the treasury.
    /// @notice Only callable by contract owner or admin after standardCliffDuration has passed.
    function standardCliffUnstake() public isAdminOrOwner {
        require(block.timestamp >= vestingStart + standardCliffDuration, "E815");

        uint balanceBefore = creditToken.balanceOf(address(this));
        creditStaking.unstake(info[address(this)].amountLocked);
        uint difference = creditToken.balanceOf(address(this)) - balanceBefore;
        require(difference >= info[address(this)].amountLocked, "E816");

        // sending staking rewards to treasury

        address[] memory tokensToDistribute = creditStaking.distributedTokens();
        //slither-disable-next-line uninitialized-local
        uint[3] memory balancesBeforeHarvest;

        for (uint i = 0; i < tokensToDistribute.length; i++) {
            balancesBeforeHarvest[i] = IERC20(tokensToDistribute[i]).balanceOf(address(this));
        }

        creditStaking.harvestAllDividends(false);

        for (uint i = 0; i < tokensToDistribute.length; i++) {
            uint amount = IERC20(tokensToDistribute[i]).balanceOf(address(this)) - balancesBeforeHarvest[i];
            IERC20(tokensToDistribute[i]).safeTransfer(treasury, amount);
        }

        delete info[address(this)].amountLocked;

        unstakedStandardCliffAmount = true;
    }

    // --- OWNER --- //

    /// @dev Withdraws contract's balance of specified tokens to owner.
    /// @notice Only callable by contract owner.
    /// @param _tokens Array of token address to withdraw.
    function emergencyWithdraw(address[] memory _tokens) external payable onlyOwner {
        for (uint i = 0; i < _tokens.length; i++) {
            IERC20(_tokens[i]).safeTransfer(owner(), IERC20(_tokens[i]).balanceOf(address(this)));
        }
    }

    /// @dev Sets admin address.
    /// @notice Only callable by contract owner.
    /// @param _newAdmin Address of new admin.
    function setAdmin(address _newAdmin) public onlyOwner {
        admin = _newAdmin;
    }
}

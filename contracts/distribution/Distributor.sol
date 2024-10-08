// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "../core/interfaces/IPair.sol";
import "../staking/interfaces/ICreditStaking.sol";
import "../farming/interfaces/ILPFarming.sol";
import "../tokens/interfaces/ICreditToken.sol";
import "../gtm/interfaces/IAlphaPoolFactory.sol";
import "./interfaces/IClaimer.sol";
import "./interfaces/IVesting.sol";
import "./interfaces/IMultiswap.sol";
import "./interfaces/IDistributor.sol";

/// @title Distributor
/// @dev Distributes Credit tokens.
contract Distributor is IDistributor, UUPSUpgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    struct InitAddresses {
        address creditToken; // The address of the ERC20 Credit token
        address vesting; // The address of the contract used to vest team and treasury allocations.
        address lpFarming; // The address of the LP farming contract.
        address creditStaking; // The address of the Credit Staking contract.
        address multiswap; // The address of the Multiswap contract.
        address teamAllocator; // The address of the team allocation contract.
        address auction; // The address of the AuctionClaim contract
        address airdrop; // The address of the AirdropClaim contract.
        address treasury; // The address of the treasury wallet.
        address alphaPoolFactory; // The address of the AlphaPoolFactory contract.
    }

    address public creditToken;

    IVesting public vesting;
    ILPFarming public lpFarming;
    ICreditStaking public creditStaking;
    IMultiswap public multiswap;

    address public teamAllocator;
    address public auction;
    address public airdrop;
    address public treasury;
    address public alphaPoolFactory;
    address public admin;

    bool public emissionRateInitialized;

    uint256 public auctionAmount;
    uint256 public airdropAmount;
    uint256 public teamAllocationAmount;
    uint256 public treasuryTotalAmount;
    uint256 public treasuryVestedAmount;
    uint256 public alphaPoolAmount;

    uint256 public ratioLower;
    uint256 public ratioUpper;
    uint256 public emissionRateLower;
    uint256 public emissionRateUpper;

    uint256 public override emissionRate;

    uint256 public startEmissionTime;
    uint256 public lastEmissionTime;

    uint256 public totalEmissions;

    uint256 public farmingReserve;
    uint256 public stakingReserve;

    /**
     * 30% of global Credit emission for Farming
     * 15% of global Credit emission for Staking
     *
     * Therefore Farming represent 67% of variable Credit emission
     * and Staking 33%.
     *
     * we will use a base of 10000 to represent 100%
     */
    uint256 public constant DISTRIBUTION_RATIO = 6700;
    uint256 public constant DISTRIBUTION_RATIO_BASE = 10000;

    modifier isAdminOrOwner() {
        require(msg.sender == owner() || (msg.sender == admin && admin != address(0)), "E901");
        _;
    }

    // --- SETUP --- //

    /// @dev Second initializer function to avoid stack too deep error, lol.
    /// @param _addresses Struct of addresses used to initialize the contract.
    /// @param _teamAllocationAmount The total amount of Credit tokens allocated to the team.
    /// @param _auctionAmount The total amount of Credit tokens allocated to auction participants.
    /// @param _treasuryTotalAmount The total amount of Credit tokens allocated to the treasury.
    /// @param _treasuryVestedAmount The amount of treasury Credit tokens that are to be vested. Must be <= _treasuryTotalAmount.
    function initialize(
        InitAddresses memory _addresses,
        uint256 _teamAllocationAmount,
        uint256 _auctionAmount,
        uint256 _airdropAmount,
        uint256 _treasuryTotalAmount,
        uint256 _treasuryVestedAmount,
        uint256 _alphaPoolAmount,
        uint256[2] memory _ratioBounds,
        uint256[2] memory _emissionRateBounds
    ) public initializer {
        require(_addresses.creditToken != address(0), "E902");
        require(_addresses.vesting != address(0), "E902");
        require(_addresses.lpFarming != address(0), "E902");
        require(_addresses.creditStaking != address(0), "E902");
        require(_addresses.multiswap != address(0), "E902");
        require(_addresses.auction != address(0), "E902");
        require(_addresses.treasury != address(0), "E902");
        require(_addresses.airdrop != address(0), "E902");
        require(_addresses.alphaPoolFactory != address(0), "E902");
        require(_treasuryTotalAmount >= _treasuryVestedAmount, "E903");

        __Ownable_init();

        creditToken = _addresses.creditToken;
        vesting = IVesting(_addresses.vesting);
        lpFarming = ILPFarming(_addresses.lpFarming);
        creditStaking = ICreditStaking(_addresses.creditStaking);
        multiswap = IMultiswap(_addresses.multiswap);

        teamAllocator = _addresses.teamAllocator;
        auction = _addresses.auction;
        airdrop = _addresses.airdrop;
        treasury = _addresses.treasury;
        alphaPoolFactory = _addresses.alphaPoolFactory;

        teamAllocationAmount = _teamAllocationAmount;
        auctionAmount = _auctionAmount;
        airdropAmount = _airdropAmount;
        treasuryTotalAmount = _treasuryTotalAmount;
        treasuryVestedAmount = _treasuryVestedAmount;
        alphaPoolAmount = _alphaPoolAmount;

        setEmissionRateParams(_ratioBounds[0], _ratioBounds[1], _emissionRateBounds[0], _emissionRateBounds[1]);
    }

    /// @dev Mint intial Credit token.
    /// @param _amount The amount of Credit token to mint and send to this (Distributor) contract.
    function mintInitialSupply(uint256 _amount) public onlyOwner {
        ICreditToken(creditToken).mint(address(this), _amount);
    }

    /// @dev Sets paramerers for emission rate calculation.
    /// @notice Only callable by contract owner.
    /// @param _ratioLower Lower limit for staked vs circulating supply ratio [18 decimals] (e.g. 0.4e18 = 40%)
    /// @param _ratioUpper Upper limit for staked vs circulating supply ratio [18 decimals]
    /// @param _emissionRateLower Emission rate of credit token for lower bounds.
    /// @param _emissionRateUpper Emission rate of credit token for upper bounds.
    function setEmissionRateParams(
        uint _ratioLower,
        uint _ratioUpper,
        uint _emissionRateLower,
        uint _emissionRateUpper
    ) public onlyOwner {
        require(_ratioUpper > _ratioLower, "E904");
        require(_ratioUpper <= 1 ether, "E905");
        require(_emissionRateUpper > _emissionRateLower, "E906");

        ratioLower = _ratioLower;
        ratioUpper = _ratioUpper;
        emissionRateLower = _emissionRateLower;
        emissionRateUpper = _emissionRateUpper;
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address) internal override onlyOwner {}

    // --- VIEW --- //

    /// @dev Determines circulating supply of Credit token.
    function getCirculatingSupply() public view override returns (uint256) {
        uint auctionClaimed = IClaimer(auction).totalClaimed();
        uint airdropClaimed = IClaimer(airdrop).totalClaimed();
        uint totalVestingReleased = vesting.getTotalReleased(); // released team + treasury tokens
        uint nonVestedTreasury = treasuryTotalAmount - treasuryVestedAmount;
        uint teamAllocatorReleased = IClaimer(teamAllocator).totalClaimed();

        uint circSupply = IAlphaPoolFactory(alphaPoolFactory).amountUnstaked() +
            totalEmissions +
            auctionClaimed +
            airdropClaimed +
            totalVestingReleased +
            nonVestedTreasury +
            teamAllocatorReleased;

        return circSupply;
    }

    // --- EXTERNAL --- //

    /// @notice Only callable by LpFarming contract.
    /// @inheritdoc IDistributor
    function claimFarmingCredit(uint256 _amount) external override returns (uint) {
        require(msg.sender == address(lpFarming), "E907");

        emitAllocations();

        uint amountToSend;

        if (_amount >= farmingReserve) {
            amountToSend = farmingReserve;
        } else {
            amountToSend = _amount;
        }

        farmingReserve -= amountToSend;

        IERC20(creditToken).safeTransfer(msg.sender, amountToSend);

        return amountToSend;
    }

    /// @notice Only callable by contract owner or admin.
    /// @inheritdoc IDistributor
    function claimAllStakingCredit() external override isAdminOrOwner {
        emitAllocations();

        //slither-disable-next-line unused-return
        IERC20(creditToken).approve(address(creditStaking), stakingReserve);
        creditStaking.addDividendsToPending(creditToken, stakingReserve);

        stakingReserve = 0;
    }

    /// @dev Gets fees from pair contracts.
    /// @notice Only callable by contract owner or admin.
    /// @param _pairs List of pair addresses to claim fees from.
    function getPairFees(address[] memory _pairs) external isAdminOrOwner {
        for (uint i = 0; i < _pairs.length; i++) {
            //slither-disable-next-line unused-return
            IPair(_pairs[i]).collectStakingFee(address(this));
        }
    }

    /// @notice Swaps an asset to up to 5 other assets according to predetermined weights.
    /// @notice Only callable by contract owner or admin.
    /// @param _token           The asset to swap (address(0) if ETH).
    /// @param _amount          The amount to swap.
    /// @param _weights         The respective weights to be attributed to each assets (in basis points, 10000 = 100%).
    /// @param _swapData        An array of data to be passed to each swap.
    function swap(
        address _token,
        uint _amount,
        bytes[] memory _swapData,
        uint[] calldata _weights
    ) external isAdminOrOwner {
        if (_token != address(0)) {
            //slither-disable-start unused-return
            IERC20(_token).approve(address(multiswap), _amount);
            multiswap.multiswap(_token, _amount, _swapData, _weights);
            //slither-disable-end unused-return
        } else {
            //slither-disable-next-line unchecked-lowlevel
            (bool success, ) = address(multiswap).call{ value: _amount }(
                abi.encodeWithSignature("multiswap(address,uint256,bytes[],uint256[])", _token, 0, _swapData, _weights)
            );

            require(success, "E908");
        }
    }

    /// @dev Sends swapped pair fees to CreditStaking contract for rewards distribution.
    /// @notice Only callable by contract owner or admin.
    /// @param _tokens List of token addresses to be sent.
    /// @param _amounts List of token amounts to be sent.
    function sendToStaking(address[] memory _tokens, uint[] memory _amounts) external isAdminOrOwner {
        require(_tokens.length == _amounts.length, "E909");

        for (uint i = 0; i < _tokens.length; i++) {
            //slither-disable-next-line unused-return
            IERC20(_tokens[i]).approve(address(creditStaking), _amounts[i]);
            creditStaking.addDividendsToPending(_tokens[i], _amounts[i]);
        }
    }

    /// @dev Sends swapped pair fees to CreditStaking contract for rewards distribution.
    /// @notice Distributor contract (this contract) must have been granted VESTING_CONTROLLER_ROLE on Vesting contract.
    /// @notice Only callable by contract owner or admin.
    /// @param _duration Total duration of treasury vesting schedule (assumes zero cliff)
    function distribute(uint _duration) external isAdminOrOwner {
        // contract must be pre-loaded with creditToken token
        require(
            IERC20(creditToken).balanceOf(address(this)) >=
                auctionAmount + airdropAmount + teamAllocationAmount + treasuryTotalAmount,
            "E910"
        );

        IERC20(creditToken).safeTransfer(auction, auctionAmount);
        IERC20(creditToken).safeTransfer(airdrop, airdropAmount);
        IERC20(creditToken).safeTransfer(teamAllocator, teamAllocationAmount);
        IERC20(creditToken).safeTransfer(treasury, treasuryTotalAmount - treasuryVestedAmount);
        IERC20(creditToken).safeTransfer(alphaPoolFactory, alphaPoolAmount);

        // approves Vesting contract to spend credit tokens held in Distributor contract
        //slither-disable-next-line unused-return
        IERC20(creditToken).approve(address(vesting), treasuryVestedAmount);

        // treasury vesting
        vesting.vestTokens(
            treasury,
            treasuryVestedAmount,
            block.timestamp + 1, // start must be > block.timestamp (Vesting contract)
            0, // no cliff
            _duration
        );

        updateCreditEmissionRate();
        emissionRateInitialized = true;

        startEmissionTime = block.timestamp;
        lastEmissionTime = block.timestamp;
    }

    // --- PUBLIC --- //

    /// @dev Determines and updates emission rate depending on staked vs circulating supply ratio.
    /// @notice Only callable by contract owner or admin.
    /// @inheritdoc IDistributor
    function updateCreditEmissionRate() public override isAdminOrOwner returns (uint) {
        if (emissionRateInitialized) {
            lpFarming.massUpdatePools();
        }

        uint newEmissionRate;

        uint totalStaked = creditStaking.totalAllocation();

        uint ratio = (totalStaked * 10 ** 18) / getCirculatingSupply();

        if (ratio <= ratioLower) {
            newEmissionRate = emissionRateLower;
        } else if (ratio >= ratioUpper) {
            newEmissionRate = emissionRateUpper;
        } else {
            newEmissionRate =
                emissionRateLower +
                (((ratio - ratioLower) * (emissionRateUpper - emissionRateLower)) / (ratioUpper - ratioLower));
        }

        emissionRate = newEmissionRate;

        emit UpdateEmissionRate(newEmissionRate);

        return emissionRate;
    }

    /// @dev Sets admin address.
    /// @notice Only callable by contract owner.
    /// @param _newAdmin Address of new admin.
    function setAdmin(address _newAdmin) public onlyOwner {
        admin = _newAdmin;
    }

    // --- INTERNAL --- //

    /// @dev Emits allocations to CreditStaking and LpFarming contracts.
    function emitAllocations() internal {
        uint256 timeSinceLastEmission = block.timestamp - lastEmissionTime;
        uint256 newEmission = timeSinceLastEmission * emissionRate;

        totalEmissions += newEmission;

        uint256 farmingCut = (newEmission * DISTRIBUTION_RATIO) / DISTRIBUTION_RATIO_BASE;
        uint256 stakingCut = newEmission - farmingCut;

        farmingReserve += farmingCut;
        stakingReserve += stakingCut;

        ICreditToken(creditToken).mint(address(this), newEmission);

        lastEmissionTime = block.timestamp;
    }
}

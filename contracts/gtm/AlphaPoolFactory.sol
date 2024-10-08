// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "../periphery/interfaces/IWETH.sol";
import "../staking/interfaces/ICreditStaking.sol";
import "../tokens/interfaces/ICreditToken.sol";
import "./interfaces/IAlphaPoolFactory.sol";
import "./interfaces/IAlphaPool.sol";
import "./libraries/ArrayAlphaPool.sol";
import "./AlphaPool.sol";

/**
 * @title AlphaPoolFactory
 * @notice A factory contract that allows users to create alpha pools, stake and distribute accordingly the CREDIT tokens and rewards
 */
contract AlphaPoolFactory is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    IAlphaPoolFactory
{
    using SafeERC20 for IERC20;

    /*///////////////////////////////////////////////////////////////
                            State variables
    //////////////////////////////////////////////////////////////*/
    address private beacon; // The beacon address
    address private treasury; // The treasury address
    IWETH private weth; // The WETH address

    address public poolOwner; // The pool owner address

    uint256 public override amountUnstaked; // Amount of CREDIT tokens that have been unstaked

    uint256 public depositStart; // The time when the deposit is possible
    uint256 public loanStart; // The start time of the loan
    ICreditStaking public creditStaking; // The credit staking contract
    IERC20 public credit; // The credit token
    uint256 public totalAllocPoint; // Total allocation points. Must be the sum of all allocation points in all pools.

    AlphaPoolInfo[] public alphaPools;

    /*///////////////////////////////////////////////////////////////
                            Initializer
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IAlphaPoolFactory
    function initialize(
        uint256 _depositStart,
        uint256 _loanStart,
        address _beacon,
        address _treasury,
        address _poolOwner,
        IWETH _weth
    ) external override initializer {
        require(_depositStart >= block.timestamp, "AlphaPoolFactory: Invalid deposit start time");
        require(_loanStart > _depositStart, "AlphaPoolFactory: Invalid loan start time");
        require(_beacon != address(0), "AlphaPoolFactory: Invalid beacon address");
        require(_treasury != address(0), "AlphaPoolFactory: Invalid treasury address");
        require(_poolOwner != address(0), "AlphaPoolFactory: Invalid pool owner address");

        __Ownable_init();
        __ReentrancyGuard_init();

        depositStart = _depositStart;
        loanStart = _loanStart;
        beacon = _beacon;
        treasury = _treasury;
        poolOwner = _poolOwner;
        weth = _weth;
    }

    function setCreditToken(address _credit) external override onlyOwner {
        require(_credit != address(0), "AlphaPoolFactory: Invalid credit address");
        credit = IERC20(_credit);
    }

    function setCreditStaking(address _creditStaking) external override onlyOwner {
        require(_creditStaking != address(0), "AlphaPoolFactory: Invalid credit staking address");
        creditStaking = ICreditStaking(_creditStaking);
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address) internal override onlyOwner {}

    /*///////////////////////////////////////////////////////////////
                            Main logic
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IAlphaPoolFactory
    function createAlphaPool(
        address _tokenA,
        address _tokenB,
        uint256 _maturity,
        uint256 _allocationPoint,
        IERC20[] calldata _tokensToDistritbute
    ) external override onlyOwner {
        require(_tokenA != address(0) || _tokenB != address(0), "AlphaPoolFactory: Invalid token address");
        require(_maturity > loanStart, "AlphaPoolFactory: Invalid maturity");

        bytes32 poolHash = keccak256(abi.encodePacked(_tokenA, _tokenB, _maturity));

        BeaconProxy beaconProxy = new BeaconProxy{ salt: poolHash }(
            beacon,
            abi.encodeWithSignature(
                "initialize(address,address,address,uint256,uint256,uint256,address[],address)",
                _tokenA,
                _tokenB,
                weth,
                _maturity,
                depositStart,
                loanStart,
                _tokensToDistritbute,
                poolOwner
            )
        );

        alphaPools.push(
            AlphaPoolInfo({
                alphaPool: IAlphaPool(address(beaconProxy)),
                allocPoint: _allocationPoint,
                maturity: _maturity
            })
        );

        totalAllocPoint += _allocationPoint;

        emit AlphaPoolCreated(_tokenA, _tokenB, address(beaconProxy), _maturity, _allocationPoint);
    }

    /// @inheritdoc IAlphaPoolFactory
    function stake(uint256 _amount) external override onlyOwner {
        require(_amount > 0, "AlphaPoolFactory: Invalid amount");

        //slither-disable-next-line unused-return
        credit.approve(address(creditStaking), _amount);
        creditStaking.stake(_amount);

        emit Stake(_amount);
    }

    /// @inheritdoc IAlphaPoolFactory
    function unstake(uint256 _amount) external override onlyOwner {
        require(_amount > 0, "AlphaPoolFactory: Invalid amount");

        uint256 balanceBefore = credit.balanceOf(address(this));
        creditStaking.unstake(_amount);
        uint256 balanceAfter = credit.balanceOf(address(this));

        uint256 unstakedAmount = balanceAfter - balanceBefore;

        if (totalAllocPoint > 0) {
            for (uint256 i = 0; i < alphaPools.length; i++) {
                AlphaPoolInfo memory pool = alphaPools[i];
                uint256 amountToTransfer = (unstakedAmount * pool.allocPoint) / totalAllocPoint;
                //slither-disable-next-line unused-return
                credit.approve(address(pool.alphaPool), amountToTransfer);
                pool.alphaPool.addTokenInterest(address(credit), amountToTransfer);
            }
        }

        amountUnstaked += _amount; // any unstaking penalties will become part of circulating suppply anyway

        emit Unstake(unstakedAmount);
    }

    /// @inheritdoc IAlphaPoolFactory
    function harvestAndDistribute() external override onlyOwner {
        address[] memory tokensToDistribute = creditStaking.distributedTokens();
        //slither-disable-next-line uninitialized-local
        uint256[3] memory balancesBeforeHarvest;

        for (uint256 i = 0; i < tokensToDistribute.length; i++) {
            balancesBeforeHarvest[i] = IERC20(tokensToDistribute[i]).balanceOf(address(this));
        }

        creditStaking.harvestAllDividends(false);

        // Nested if but it should run only 12 iterations (4 * 3)
        for (uint256 i = 0; i < tokensToDistribute.length; i++) {
            uint256 balanceAfterHarvest = IERC20(tokensToDistribute[i]).balanceOf(address(this));
            uint256 amountToDistribute = balanceAfterHarvest - balancesBeforeHarvest[i];
            if (amountToDistribute > 0) {
                // 50% of the reward goes to the treasury
                uint256 treasuryFee = amountToDistribute / 2;
                IERC20(tokensToDistribute[i]).safeTransfer(treasury, treasuryFee);
                // the rest goes to alpha pools
                if (totalAllocPoint > 0) {
                    for (uint256 j = 0; j < alphaPools.length; j++) {
                        AlphaPoolInfo memory pool = alphaPools[j];
                        uint256 amountToTransfer = ((amountToDistribute - treasuryFee) * pool.allocPoint) /
                            totalAllocPoint;
                        //slither-disable-next-line unused-return
                        IERC20(tokensToDistribute[i]).approve(address(pool.alphaPool), amountToTransfer);
                        pool.alphaPool.addTokenInterest(tokensToDistribute[i], amountToTransfer);
                    }
                }
            }
        }

        emit Harvest();
    }

    /// @inheritdoc IAlphaPoolFactory
    function changeAllocationPoint(uint256 _poolId, uint256 _allocationPoint) external override onlyOwner {
        require(_allocationPoint > 0, "AlphaPoolFactory: Invalid allocation point");

        AlphaPoolInfo storage pool = alphaPools[_poolId];
        totalAllocPoint = totalAllocPoint - pool.allocPoint + _allocationPoint;
        pool.allocPoint = _allocationPoint;

        emit AllocationPointChanged(_poolId, _allocationPoint);
    }

    /// @inheritdoc IAlphaPoolFactory
    function setTreasury(address _treasury) external override onlyOwner {
        require(_treasury != address(0), "AlphaPoolFactory: Invalid treasury address");
        treasury = _treasury;
    }
}

// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "./interfaces/IAlphaPool.sol";
import "../periphery/interfaces/IWETH.sol";

/**
 * @title AlphaPool
 * @notice A pool that allows users to deposit two tokens and receive a loan in return.
 * The pool has 3 phases:
 * 1. Deposit phase: users can deposit ETH and receive a loan in return.
 * 2. Loan phase: admin can transfer the ETH and repay the loan and interest.
 * 3. Settlement phase: users can withdraw their collateral and interest.
 */
contract AlphaPool is Initializable, ReentrancyGuardUpgradeable, IAlphaPool {
    using SafeERC20 for IERC20;

    /*///////////////////////////////////////////////////////////////
                            State variables
    //////////////////////////////////////////////////////////////*/
    address public owner;
    address public factory;
    IERC20 public tokenA;
    IERC20 public tokenB;
    IWETH public weth;

    uint256 public depositStart;
    uint256 public loanStart;
    uint256 public maturity;

    bool public isSettlementOn;

    IERC20[] public tokensToDistribute;

    uint256 public totalPledged; // ETH principal collected by the protocol
    uint256 public totalEthToReimburse; // ETH to reimburse by the protocol

    mapping(address => uint256) public pledges;

    mapping(address => uint256) public tokensInterest;

    mapping(address => mapping(address => bool)) public addressCollectedInterest;
    mapping(address => bool) public addressCollectedPrincipal;

    uint256 private constant RATIO_PRECISION = 1e18;

    /*///////////////////////////////////////////////////////////////
                            Modifiers
    //////////////////////////////////////////////////////////////*/
    modifier onlyAfterDepositReady() {
        require(block.timestamp >= depositStart, "AlphaPool: Deposit not opened");
        require(block.timestamp < loanStart, "AlphaPool: Deposit finished");
        _;
    }

    modifier onlyAfterLoanStart() {
        require(block.timestamp >= loanStart, "AlphaPool: Loan not ready");
        require(block.timestamp < maturity, "AlphaPool: Loan not ready");
        _;
    }

    modifier onlyAtSettlement() {
        require(block.timestamp >= maturity && isSettlementOn, "AlphaPool: Pool not ready for settlement");
        _;
    }

    modifier onlyOwnerOrFactory() {
        require(msg.sender == owner || msg.sender == factory, "AlphaPool: Only owner");
        _;
    }

    /*///////////////////////////////////////////////////////////////
                            Initializer
    //////////////////////////////////////////////////////////////*/
    function initialize(
        IERC20 _tokenA,
        IERC20 _tokenB,
        IWETH _weth,
        uint256 _maturity,
        uint256 _depositStart,
        uint256 _loanStart,
        IERC20[] calldata _tokensToDistribute,
        address _owner
    ) external initializer {
        __ReentrancyGuard_init();

        owner = _owner;
        factory = msg.sender;

        tokenA = _tokenA;
        tokenB = _tokenB;
        weth = _weth;
        maturity = _maturity;
        depositStart = _depositStart;
        loanStart = _loanStart;
        tokensToDistribute = _tokensToDistribute;
    }

    /*///////////////////////////////////////////////////////////////
                            Admin
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Transfer ownership to a new address
     */
    function transferOwnership(address _newOwner) external onlyOwnerOrFactory {
        owner = _newOwner;
    }

    /**
     * @notice Set the settlement on (which marks the end of the loan period)
     */
    function settlementOn() external onlyOwnerOrFactory {
        require(!isSettlementOn, "AlphaPool: settlement already activated");

        isSettlementOn = true;

        emit SettlementOn();
    }

    /// @inheritdoc IAlphaPool
    function addEthToReimburse() external payable override onlyOwnerOrFactory onlyAfterLoanStart {
        require(block.timestamp < maturity, "AlphaPool: maturity reached");

        totalEthToReimburse = totalEthToReimburse + msg.value;

        emit AddEthToReimburse(msg.value);
    }

    /// @inheritdoc IAlphaPool
    function addTokenInterest(address _token, uint256 _amount) external override onlyOwnerOrFactory onlyAfterLoanStart {
        require(block.timestamp < maturity, "AlphaPool: maturity reached");
        require(_isDistributedToken(_token), "AlphaPool: Invalid token");

        tokensInterest[_token] = tokensInterest[_token] + _amount;
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        emit AddTokenInterest(_token, _amount);
    }

    /**
     * @notice Owner can withdraw tokens (interest) that will be distributed to the depositors
     * @dev Can only happen at loan phase
     */
    function withdrawAdmin(address payable _receiver, uint256 _amount) external onlyOwnerOrFactory onlyAfterLoanStart {
        //slither-disable-next-line unchecked-lowlevel
        (bool success, ) = _receiver.call{ value: _amount }("");
        require(success, "AlphaPool: ETH withdraw failed");

        emit WithdrawAdmin(_receiver, _amount);
    }

    /*///////////////////////////////////////////////////////////////
                            External
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IAlphaPool
    function getUserRatio(address _user) public view override returns (uint256) {
        return _getUserRatio(_user);
    }

    /// @inheritdoc IAlphaPool
    function pledge() external payable override nonReentrant onlyAfterDepositReady {
        require(msg.value > 0, "AlphaPool: Invalid amount");

        totalPledged = totalPledged + msg.value;
        pledges[msg.sender] = pledges[msg.sender] + msg.value;

        emit Pledge(msg.sender, msg.value);
    }

    /// @inheritdoc IAlphaPool
    function withdraw() external override nonReentrant onlyAtSettlement {
        _withdraw();
    }

    /// @inheritdoc IAlphaPool
    function harvest(address _token) external override nonReentrant onlyAtSettlement {
        _harvest(_token);
    }

    /// @inheritdoc IAlphaPool
    function harvestAll() external override nonReentrant onlyAtSettlement {
        _harvestAll();
    }

    /// @inheritdoc IAlphaPool
    function withdrawAndHarvestAll() external override nonReentrant onlyAtSettlement {
        _withdraw();
        _harvestAll();
    }

    /*///////////////////////////////////////////////////////////////
                            Internal
    //////////////////////////////////////////////////////////////*/

    function _isDistributedToken(address _token) internal view returns (bool) {
        uint256 tokensToDistributeLength = tokensToDistribute.length;
        for (uint256 i = 0; i < tokensToDistributeLength; i++) {
            if (address(tokensToDistribute[i]) == _token) {
                return true;
            }
        }
        return false;
    }

    function _harvestAll() internal {
        for (uint256 i = 0; i < tokensToDistribute.length; i++) {
            if (
                !addressCollectedInterest[msg.sender][address(tokensToDistribute[i])] &&
                tokensInterest[address(tokensToDistribute[i])] > 0
            ) {
                _harvest(address(tokensToDistribute[i]));
            }
        }
    }

    function _harvest(address _token) internal {
        require(_isDistributedToken(_token), "AlphaPool: Invalid token");

        require(!addressCollectedInterest[msg.sender][_token], "AlphaPool: Already collected interest");
        require(totalPledged > 0, "AlphaPool: Invalid state");
        require(tokensInterest[_token] > 0, "AlphaPool: Invalid balance");
        require(pledges[msg.sender] > 0, "AlphaPool: User has no principal");

        uint256 amount = (_getUserRatio(msg.sender) * tokensInterest[_token]) / RATIO_PRECISION;
        addressCollectedInterest[msg.sender][_token] = true;
        bool isReceipt = address(_token) == address(weth);
        _safeTokenTransfer(IERC20(_token), payable(msg.sender), amount, isReceipt);

        emit Harvest(msg.sender, _token, amount);
    }

    function _withdraw() internal {
        require(!addressCollectedPrincipal[msg.sender], "AlphaPool: Already collected principal");
        require(totalPledged > 0, "AlphaPool: Invalid state");
        require(totalEthToReimburse > 0, "AlphaPool: Invalid balance");
        require(pledges[msg.sender] > 0, "AlphaPool: User has not pledged");

        uint256 amount = (_getUserRatio(msg.sender) * totalEthToReimburse) / RATIO_PRECISION;

        addressCollectedPrincipal[msg.sender] = true;

        //slither-disable-next-line unchecked-lowlevel
        (bool success, ) = payable(msg.sender).call{ value: amount }("");
        require(success, "AlphaPool: ETH withdraw failed");

        emit Withdraw(msg.sender, amount);
    }

    function _getUserRatio(address _user) internal view returns (uint256 ratio) {
        require(totalPledged > 0, "AlphaPool: Invalid state");
        ratio = (pledges[_user] * RATIO_PRECISION) / totalPledged;
    }

    /**
     * @dev Safe token transfer function, in case rounding error causes pool to not have enough tokens and deal with ETH
     */
    // slither-disable-next-line arbitrary-send-eth
    function _safeTokenTransfer(IERC20 token, address payable to, uint256 amount, bool _receiptToken) internal {
        if (_receiptToken) {
            require(address(token) == address(weth), "_safeTokenTransfer: not receipt token");
        }

        if (amount > 0) {
            uint256 tokenBal = token.balanceOf(address(this));

            uint256 amountToTransfer = amount;
            if (amountToTransfer > tokenBal) {
                amountToTransfer = tokenBal;
            }

            if (address(token) == address(weth) && _receiptToken) {
                IWETH(weth).withdraw(amountToTransfer);
                //slither-disable-next-line unchecked-lowlevel
                (bool success, ) = payable(to).call{ value: amountToTransfer }("");
                require(success, "AlphaPool: ETH_TRANSFER_FAILED");
            } else {
                token.safeTransfer(to, amountToTransfer);
            }
        }
    }

    /*///////////////////////////////////////////////////////////////
                            Misc
    //////////////////////////////////////////////////////////////*/

    receive() external payable {
        require(msg.sender == address(weth), "AlphaPool: invalid sender");
    }

    fallback() external payable {
        revert("AlphaPool: Invalid function call. Try with pledge()");
    }
}

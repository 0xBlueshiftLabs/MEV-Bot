// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.20;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../core/interfaces/IPair.sol";
import "../periphery/interfaces/IRouter.sol";

import "./interfaces/Uniswap.sol";
import "./interfaces/IUniswapV2Callee.sol";

import "hardhat/console.sol";

/// @title Flash contract implementation
/// @notice An example contract using the Uniswap V3 flash function
contract PairFlash is IERC721Receiver, IUniswapV2Callee, Ownable {
    using SafeERC20 for IERC20;

    IRouter public immutable creditRouter;
    IUniswapV2Router public immutable uniswapV2Router;
    address public uniswapV2Factory;

    address public immutable weth;

    address public admin;
    address public recipient;

    // used in uniswap callback. TO-DO: could be encoded in data and retured by uniswap callback
    address asset;
    address collateral;
    uint256 maturity;
    uint112 assetOut;
    uint112 maxDebt;
    uint112 maxCollateral;

    /*///////////////////////////////////////////////////////////////
                        STRUCTS
    //////////////////////////////////////////////////////////////*/

    //fee1 is the fee of the pool from the initial borrow
    //fee2 is the fee of the first pool to swap from
    //fee3 is the fee of the second pool to swap from
    struct FlashParams {
        address tokenA;
        address tokenB;
        uint24 fee1;
        uint256 amountA;
        uint256 amountB;
        uint24 fee2;
        uint24 fee3;
    }

    // // fee2 and fee3 are the two other fees associated with the two other pools of token0 and token1
    // struct FlashCallbackData {
    //     uint256 amount0;
    //     uint256 amount1;
    //     address payer;
    //     PoolAddress.PoolKey poolKey;
    //     uint24 poolFee2;
    //     uint24 poolFee3;
    // }

    struct Params {
        address creditPair;
        uint maturity;
        uint112 assetOut;
        uint112 maxDebt;
        uint112 maxCollateral;
        uint112 x;
        uint112 y;
        uint112 z;
        bytes32[] merkleProof;
    }

    struct RouteData {
        address flashPoolCounterToken;
        uint24 flashPoolFee;
        uint24 swapPoolFee;
    }

    /*///////////////////////////////////////////////////////////////
                        MAPPINGS
    //////////////////////////////////////////////////////////////*/

    mapping(address => RouteData) public route;

    /*///////////////////////////////////////////////////////////////
                        MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier isAdminOrOwner() {
        require(msg.sender == owner() || (msg.sender == admin && admin != address(0)), "Caller is not admin or owner");
        _;
    }

    /*///////////////////////////////////////////////////////////////
                        CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        IRouter _creditRouter,
        IUniswapV2Router _uniswapV2Router,
        address _uniswapV2Factory,
        address _WETH9,
        address _admin,
        address _recipient
    ) {
        // TODO: add require addresss != zero address statements

        creditRouter = _creditRouter;
        uniswapV2Router = _uniswapV2Router;
        uniswapV2Factory = _uniswapV2Factory;

        weth = _WETH9;

        admin = _admin;
        recipient = _recipient;
    }

    function execute(Params memory params) external isAdminOrOwner {
        //require(route[params.creditPair].flashPoolCounterToken != address(0), "Pair not initialized");

        maturity = params.maturity;
        assetOut = params.assetOut;
        maxDebt = params.maxDebt;
        maxCollateral = params.maxCollateral;

        // check that pool state has not changed
        (uint112 x, uint112 y, uint112 z) = IPair(params.creditPair).constantProduct(params.maturity);
        require(x == params.x && y == params.y && z == params.z, "Pool state has changed");

        asset = address(IPair(params.creditPair).asset());
        collateral = address(IPair(params.creditPair).collateral());

        address pair = IUniswapV2Factory(uniswapV2Factory).getPair(collateral, weth); // TODO: won't work if collateral is WETH
        require(pair != address(0), "Pair does not exist");

        address token0 = IUniswapV2Pair(pair).token0();
        address token1 = IUniswapV2Pair(pair).token1();
        uint amount0Out = collateral == token0 ? maxCollateral : 0;
        uint amount1Out = collateral == token1 ? maxCollateral : 0;

        // need to pass some data to trigger uniswapV2Call
        bytes memory data = abi.encode(collateral, maxCollateral, params.merkleProof);

        console.log("Collateral token balance of contract: ", IERC20(collateral).balanceOf(address(this)));

        IUniswapV2Pair(pair).swap(amount0Out, amount1Out, address(this), data);
    }

    function uniswapV2Call(address _sender, uint _amount0, uint _amount1, bytes calldata _data) external override {
        address token0 = IUniswapV2Pair(msg.sender).token0();
        address token1 = IUniswapV2Pair(msg.sender).token1();
        address pair = IUniswapV2Factory(uniswapV2Factory).getPair(token0, token1);
        require(msg.sender == pair, "!pair");
        require(_sender == address(this), "!sender");

        (address tokenFlashBorrowed, uint amount, bytes32[] memory merkleProof) = abi.decode(
            _data,
            (address, uint, bytes32[])
        );

        console.log("Collateral token balance of contract: ", IERC20(collateral).balanceOf(address(this)));
        console.log();

        // borrow from Credit creditPair

        //slither-disable-next-line unused-return
        IERC20(tokenFlashBorrowed).approve(address(creditRouter), maxCollateral);

        IBorrow.BorrowGivenPercent memory borrowParams = IBorrow.BorrowGivenPercent(
            IERC20(asset),
            IERC20(collateral),
            maturity,
            address(this), // assetTo
            address(this), // dueTo
            assetOut, // uint112 assetOut;
            2 ** 31, // midpoint  uint40 percent;
            maxDebt, // uint112 maxDebt;
            maxCollateral, // uint112 maxCollateral;
            block.timestamp // uint256 deadline;
        );

        console.log("Collateral token balance of contract: ", IERC20(collateral).balanceOf(address(this)));
        console.log("Asset token balance of contract: ", IERC20(asset).balanceOf(address(this)));
        console.log();

        uint actualAssetOut;
        //slither-disable-next-line unused-return
        (actualAssetOut, , ) = creditRouter.borrowGivenPercent(borrowParams, merkleProof);
        console.log("Actual asset out: ", actualAssetOut);

        // swap back to flash loaned token (asset token => collateral token)

        IERC20(asset).safeApprove(address(uniswapV2Router), actualAssetOut);

        address[] memory path;

        // if (asset == weth) {
        //     path = new address[](2);
        //     path[0] = weth;
        //     path[1] = collateral;
        // } else if (collateral == weth) {
        //     path = new address[](2);
        //     path[0] = asset;
        //     path[1] = weth;
        // } else {
        //     path = new address[](3);
        //     path[0] = asset;
        //     path[1] = weth;
        //     path[2] = collateral;
        // }

        path = new address[](2);
        path[0] = asset;
        path[1] = collateral;

        // profitability parameters - we must receive at least the required payment from the swap
        uint fee = ((amount * 3) / 997) + 1;
        uint amountToRepay = amount + fee;

        IUniswapV2Router(uniswapV2Router).swapExactTokensForTokens(
            actualAssetOut, // amountIn
            amountToRepay, // minimum amount out
            path,
            address(this),
            block.timestamp
        );

        console.log("Collateral token balance of contract: ", IERC20(collateral).balanceOf(address(this)));
        console.log("Asset token balance of contract: ", IERC20(asset).balanceOf(address(this)));
        console.log();

        // repay fees etc
        IERC20(collateral).safeTransfer(pair, amountToRepay);

        console.log("Collateral token balance of contract: ", IERC20(collateral).balanceOf(address(this)));
        console.log("Asset token balance of contract: ", IERC20(asset).balanceOf(address(this)));
        console.log();
        console.log("Profit: ", IERC20(collateral).balanceOf(address(this)));

        if (IERC20(collateral).balanceOf(address(this)) > 0) {
            IERC20(collateral).safeTransfer(recipient, IERC20(collateral).balanceOf(address(this)));
        }
    }

    // --- VIEW FUNCTIONS --- //

    // function getUniswapPool(address _tokenA, address _tokenB, uint24 _fee) public view returns (address) {
    //     address pool = uniswapV2Factory.getPool(_tokenA, _tokenB, _fee);
    //     require(pool != address(0), "Pool does not exist");
    //     return pool;
    // }

    // function estimateAmountOut(
    //     address token0,
    //     address token1,
    //     uint24 fee,
    //     address tokenIn,
    //     uint128 amountIn,
    //     uint32 secondsAgo
    // ) public view returns (uint amountOut) {
    //     require(tokenIn == token0 || tokenIn == token1, "invalid token");

    //     address tokenOut = tokenIn == token0 ? token1 : token0;

    //     address pool = uniswapV2Factory.getPool(token0, token1, fee);
    //     require(pool != address(0), "Pool does not exist");

    //     //slither-disable-next-line unused-return
    //     (int24 tick, ) = OracleLibrary.consult(pool, secondsAgo);
    //     amountOut = OracleLibrary.getQuoteAtTick(tick, amountIn, tokenIn, tokenOut);
    // }

    // --- ONLY OWNER FUNCTIONS --- //

    function setRecipient(address _newRecipient) external onlyOwner {
        recipient = _newRecipient;
    }

    function setAdmin(address _newAdmin) external onlyOwner {
        admin = _newAdmin;
    }

    // function setRoute(address _pair, RouteData memory _data) external onlyOwner {
    //     // TODO: check that Credit pair exists

    //     require(
    //         uniswapV2Factory.getPool(
    //             address(IPair(_pair).collateral()),
    //             _data.flashPoolCounterToken,
    //             _data.flashPoolFee
    //         ) != address(0),
    //         "Flash pool does not exist"
    //     );
    //     require(
    //         uniswapV2Factory.getPool(
    //             address(IPair(_pair).collateral()),
    //             address(IPair(_pair).asset()),
    //             _data.swapPoolFee
    //         ) != address(0),
    //         "Swap pool does not exist"
    //     );

    //     route[_pair] = _data;
    // }

    /*///////////////////////////////////////////////////////////////
                        IERC 721 logic
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IERC721Receiver
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}

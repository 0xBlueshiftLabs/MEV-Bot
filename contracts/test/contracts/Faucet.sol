// SPDX-License-Identifier: MIT
pragma solidity =0.8.20;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Faucet {
    address public constant ETH_ADDRESS = address(0);

    address public admin;

    uint256 public currentEpoch;

    mapping(uint256 => mapping(address => mapping(address => bool))) public claimed; // to track who claimed (eth + erc20s)
    mapping(uint256 => mapping(address => bool)) public tokenAddresses; // allowed tokens to withdraw
    mapping(uint256 => bytes32) public merkleRoots; // merkle root of each epoch
    mapping(uint256 => uint256) public maxEthWithdrawable;
    mapping(uint256 => uint256) public maxErc20Withdrawable;

    constructor() {
        admin = msg.sender;
    }

    function initNextEpoch(
        address[] memory _tokenAddresses,
        bytes32 _merkleRoot,
        uint256 _maxEthWithdrawable,
        uint256 _maxErc20Withdrawable
    ) external onlyAdmin {
        currentEpoch++;
        merkleRoots[currentEpoch] = _merkleRoot;
        for (uint256 i = 0; i < _tokenAddresses.length; i++) {
            tokenAddresses[currentEpoch][_tokenAddresses[i]] = true;
        }
        tokenAddresses[currentEpoch][ETH_ADDRESS] = true;

        maxEthWithdrawable[currentEpoch] = _maxEthWithdrawable;
        maxErc20Withdrawable[currentEpoch] = _maxErc20Withdrawable;
    }

    function modifyMaxWithdrawable(uint256 _epoch, uint256 _ethAmount, uint256 _ercAmount) external onlyAdmin {
        maxEthWithdrawable[_epoch] = _ethAmount;
        maxErc20Withdrawable[_epoch] = _ercAmount;
    }

    function modifyRoot(uint256 _epoch, bytes32 _merkleRoot) external onlyAdmin {
        merkleRoots[_epoch] = _merkleRoot;
    }

    function addToken(uint256 _epoch, address _tokenAddresses) external onlyAdmin {
        tokenAddresses[_epoch][_tokenAddresses] = true;
    }

    function removeToken(uint256 _epoch, address _tokenAddresses) external onlyAdmin {
        tokenAddresses[_epoch][_tokenAddresses] = false;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    modifier onlyWhitelist(bytes32[] calldata _merkleProof) {
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender))));
        require(MerkleProof.verify(_merkleProof, merkleRoots[currentEpoch], leaf), "Faucet: Not part of the whitelist");
        _;
    }

    function mint(bytes32[] calldata _merkleProof, address _tokenAddress) external onlyWhitelist(_merkleProof) {
        require(!claimed[currentEpoch][msg.sender][_tokenAddress], "Faucet: already claimed");
        require(tokenAddresses[currentEpoch][_tokenAddress], "Faucet: token not allowed");

        claimed[currentEpoch][msg.sender][_tokenAddress] = true;

        uint256 amount = 0;
        if (_tokenAddress == ETH_ADDRESS) {
            amount = address(this).balance >= maxEthWithdrawable[currentEpoch]
                ? maxEthWithdrawable[currentEpoch]
                : address(this).balance;
            payable(msg.sender).transfer(amount);
        } else {
            amount = maxErc20Withdrawable[currentEpoch];
            ERC20PresetMinterPauser(_tokenAddress).mint(msg.sender, amount);
        }
    }

    function mintAdmin(address _tokenAddress, uint256 _amount, address _to) external onlyAdmin {
        require(_to != address(0), "Invalid address");
        if (_tokenAddress == ETH_ADDRESS) {
            require(address(this).balance >= _amount, "Not enough ETH");
            payable(_to).transfer(_amount);
        } else {
            ERC20PresetMinterPauser(_tokenAddress).mint(_to, _amount);
        }
    }

    function withdraw(address _tokenAddress, uint256 _amount, address payable _to) external onlyAdmin {
        require(_to != address(0), "Invalid address");
        if (_tokenAddress == ETH_ADDRESS) {
            require(address(this).balance >= _amount, "Not enough ETH");
            _to.transfer(_amount);
        } else {
            ERC20PresetMinterPauser(_tokenAddress).transfer(_to, _amount);
        }
    }

    receive() external payable {} // fallback function to accept ETH
}

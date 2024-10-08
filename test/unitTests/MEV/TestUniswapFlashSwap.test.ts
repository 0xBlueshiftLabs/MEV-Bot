import { expect } from "chai";
import { ethers, network } from "hardhat";

let signers = [];
let whale;

let factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
let wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
let usdc;

const whaleAddress = "0xf89d7b9c864f589bbF53a82105107622B35EaA40"; // random USDC holder on Eth mainnet
const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

let flashSwap;

describe("UniswapV2 flash loan test", function () {
  before(async () => {
    signers = await ethers.getSigners();

    // impersonate account
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [whaleAddress],
    });
    whale = await ethers.getSigner(whaleAddress);

    const FlashSwap = await ethers.getContractFactory("TestUniswapFlashSwap");
    flashSwap = await FlashSwap.deploy(wethAddress, factoryAddress);
    await flashSwap.deployed();

    usdc = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", usdcAddress);
    await usdc.connect(whale).transfer(flashSwap.address, 10e6);
    expect(await usdc.balanceOf(flashSwap.address)).to.equal(10e6);
  });

  it("Can flash loan", async () => {
    await flashSwap.testFlashSwap(usdcAddress, 1000e6); // $1000.00
  });
});

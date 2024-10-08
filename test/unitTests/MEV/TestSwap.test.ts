import { ethers, network } from "hardhat";

let signers = [];
let whale;

let routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
let wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
let usdc, dai, weth;

const whaleAddress = "0x57757E3D981446D585Af0D9Ae4d7DF6D64647806"; // random USDC holder on Eth mainnet
const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

let testSwap;

describe("UniswapV2 swap test", function () {
  before(async () => {
    signers = await ethers.getSigners();

    // impersonate account
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [whaleAddress],
    });
    whale = await ethers.getSigner(whaleAddress);

    const TestSwap = await ethers.getContractFactory("TestSwap");

    testSwap = await TestSwap.deploy(wethAddress, routerAddress);

    await testSwap.deployed();

    usdc = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", usdcAddress);
    dai = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", daiAddress);
    weth = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", wethAddress);
    // await usdc.connect(whale).transfer(flashSwap.address, 10e6);
    // expect(await usdc.balanceOf(flashSwap.address)).to.equal(10e6);
  });

  it("Can swap", async () => {
    await dai.connect(whale).approve(testSwap.address, ethers.utils.parseEther("1"));

    console.log(await usdc.balanceOf(signers[0].address));

    await testSwap.connect(whale).swap(daiAddress, usdcAddress, ethers.utils.parseEther("1"), 1, signers[0].address); // $1000.00

    console.log(await usdc.balanceOf(signers[0].address));
  });
});

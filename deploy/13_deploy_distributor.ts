import { HardhatRuntimeEnvironment } from "hardhat/types";

import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat";
import type { DeployFunction } from "hardhat-deploy/types";

interface InitAddresses {
  creditToken: string; // The address of the ERC20 Credit token
  vesting: string; // The address of the contract used to vest team and treasury allocations.
  lpFarming: string; // The address of the LP farming contract.
  creditStaking: string; // The address of the Credit Staking contract.
  multiswap: string; // The address of Multiswap contract.
  teamAllocator: string; // The address of the team allocation contract.
  auction: string; // The address of the AuctionClaim contract
  airdrop: string; // The address of the AirdropClaim contract.
  treasury: string; // The address of the treasury wallet.
  alphaPoolFactory: string; // The address of the alphaPoolFactory contract.
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { log } = deployments;
  const { deployer } = await getNamedAccounts();

  const creditTokenAddress = (await deployments.get("CreditToken")).address;
  const vestingAddress = (await deployments.get("Vesting")).address;
  const lpFarmingAddress = (await deployments.get("LPFarming")).address;
  const creditStakingAddress = (await deployments.get("CreditStaking")).address;
  let multiswapAddress = "0x0E7D0D4AE86054D182a2a82590967Bd5ac2c7EeE"; // mainnet
  if ((await hre.getChainId()) === "421613") {
    multiswapAddress = "0xa9d1Daeb885e5f1E347E39Fbca3E9d0878a14F32";
  }
  const teamAllocatorAddress = (await deployments.get("TeamAllocator")).address;
  const auctionClaimerAddress = (await deployments.get("AuctionClaimer")).address;
  const airdropClaimerAddress = (await deployments.get("AirdropClaimer")).address;
  const treasuryAddress = deployer; // TODO: add treasury address
  const alphaPoolFactoryAddress = (await deployments.get("AlphaPoolFactory")).address;

  const initAddresses: InitAddresses = {
    creditToken: creditTokenAddress,
    vesting: vestingAddress,
    lpFarming: lpFarmingAddress,
    creditStaking: creditStakingAddress,
    multiswap: multiswapAddress,
    teamAllocator: teamAllocatorAddress,
    auction: auctionClaimerAddress,
    airdrop: airdropClaimerAddress,
    treasury: treasuryAddress,
    alphaPoolFactory: alphaPoolFactoryAddress,
  };
  const teamAllocationAmount = ethers.utils.parseEther("100000"); // 10% of total supply
  const auctionAmount = ethers.utils.parseEther("100000"); // 10% of total supply
  const airdropAmount = ethers.utils.parseEther("100000"); // 10% of total supply
  const treasuryTotalAmount = ethers.utils.parseEther("150000"); // 15% of total supply
  const treasuryVestedAmount = ethers.utils.parseEther("50000"); // 5% of total supply
  const alphaPoolAmount = ethers.utils.parseEther("100000"); // 10% of total supply
  const ratioBounds = [ethers.utils.parseEther("0.3"), ethers.utils.parseEther("0.9")]; // 30% - 90%
  const emissionRateBounds = [BigNumber.from(5636724386724390), BigNumber.from("31001984126984100")]; // 0.005 - 0.03 $CREDIT per second - see https://tinyurl.com/z6au2cfn

  const Distributor = await ethers.getContractFactory("Distributor");

  const distributor = await upgrades.deployProxy(
    Distributor,
    [
      initAddresses,
      teamAllocationAmount,
      auctionAmount,
      airdropAmount,
      treasuryTotalAmount,
      treasuryVestedAmount,
      alphaPoolAmount,
      ratioBounds,
      emissionRateBounds,
    ],
    {
      initializer: "initialize",
    }
  );
  await distributor.deployed();

  // init contracts with distributor address
  const staking = await ethers.getContractAt("CreditStaking", creditStakingAddress);
  await staking.setDistributor(distributor.address);

  const farming = await ethers.getContractAt("LPFarming", lpFarmingAddress);
  await farming.setDistributor(distributor.address);

  const creditToken = await ethers.getContractAt("CreditToken", creditTokenAddress);
  await creditToken.setDistributor(distributor.address);

  // initial mint
  await distributor.mintInitialSupply(ethers.utils.parseEther("550000")); // 55% of total supply

  // keccak256 of "VESTING_ADMIN"
  const vestingRoleHash = "0xc23e4cf9f9c5137c948ad4a95211794895d43271639a97b001bd23951d54c84a";
  const vesting = await hre.ethers.getContractAt("Vesting", vestingAddress);
  await vesting.connect(await hre.ethers.getSigner(deployer)).grantRole(vestingRoleHash, distributor.address);
  log("Distributor is now the vesting admin");
  log("Distributor deployed:", distributor.address);
  deployments.save("Distributor", { abi: [], address: distributor.address });
};

export default func;
func.tags = ["Distributor"];
func.dependencies = [
  "CreditToken",
  "Vesting",
  "CreditStaking",
  "LPFarming",
  "AirdropClaimer",
  "AuctionClaimer",
  "TeamAllocator",
  "AlphaPoolFactory",
];

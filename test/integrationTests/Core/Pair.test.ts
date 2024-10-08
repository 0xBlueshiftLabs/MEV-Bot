import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { ethers, waffle } from "hardhat";
import { Address } from "hardhat-deploy/dist/types";

import { IERC20 } from "../../../typechain/IERC20";
import { IFactory } from "../../../typechain/IFactory";
import Constants from "../../utils/shared/Constants";
import { factoryInit } from "../../utils/shared/Factory";
import { now, pseudoRandomBigUint256 } from "../../utils/shared/Helper";
import { testTokenNew } from "../../utils/shared/TestToken";

import { CreditPairV2Storage, UpgradeableBeacon } from "../../../typechain";
import { IPair } from "../../../typechain/CreditMathTest";
import type { CreditPair } from "../../../typechain/CreditPair";
import { CreditPairV2 } from "../../../typechain/CreditPairV2";

const { solidity } = waffle;
chai.use(solidity);
const { expect } = chai;

describe("Core#Pair", () => {
  let signers: SignerWithAddress[];
  let factory: IFactory;
  let assetToken: IERC20;
  let collateralToken: IERC20;
  let assetValue: bigint = pseudoRandomBigUint256();
  let collateralValue: bigint = pseudoRandomBigUint256();
  let pairContractAddress: Address;
  let creditMathContractAddress: Address;
  let upgradeableBeacon: UpgradeableBeacon;
  let proxyContract: CreditPair | CreditPairV2 | CreditPairV2Storage;
  let creditPairFactoryV1;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    const creditMathFactory = await ethers.getContractFactory("CreditMath");
    creditMathContractAddress = (await creditMathFactory.deploy()).address;

    creditPairFactoryV1 = await ethers.getContractFactory("CreditPair", {
      libraries: { CreditMath: creditMathContractAddress },
    });
    const upgradeableBeaconFactory = await ethers.getContractFactory("UpgradeableBeacon");

    const creditPairV1 = await creditPairFactoryV1.deploy();

    upgradeableBeacon = (await upgradeableBeaconFactory.deploy(creditPairV1.address)) as unknown as UpgradeableBeacon;

    factory = (await factoryInit(
      signers[0].address,
      signers[0].address,
      signers[0].address,
      upgradeableBeacon.address,
      undefined,
      undefined,
      undefined
    )) as unknown as IFactory;

    assetToken = (await testTokenNew("Ether", "WETH", assetValue)) as unknown as IERC20;
    collateralToken = (await testTokenNew("Matic", "MATIC", collateralValue)) as unknown as IERC20;
  });

  describe("Create Pair", () => {
    it("should create a pair if called by owner", async () => {
      await factory.connect(signers[0]).createPair(assetToken.address, collateralToken.address);
      const pair = await factory.getPair(assetToken.address, collateralToken.address);
      expect(pair).to.be.not.eq(ethers.constants.AddressZero);
    });

    it("should create a pair if called by pair creator", async () => {
      await factory.setPairCreator(signers[2].address);
      await factory.connect(signers[2]).createPair(assetToken.address, collateralToken.address);
      const pair = await factory.getPair(assetToken.address, collateralToken.address);
      expect(pair).to.be.not.eq(ethers.constants.AddressZero);
    });

    it("should fail create a pair when called with non owner nor pair creator", async () => {
      await expect(
        factory.connect(signers[2]).createPair(assetToken.address, collateralToken.address)
      ).to.be.revertedWith("E102");
      const pair = await factory.getPair(assetToken.address, collateralToken.address);
      expect(pair).to.be.eq(ethers.constants.AddressZero);
    });
  });

  describe("Upgradeability", () => {
    beforeEach(async () => {
      pairContractAddress = await factory.callStatic.createPair(assetToken.address, collateralToken.address);
      expect(pairContractAddress).to.be.properAddress;
      await expect(await factory.createPair(assetToken.address, collateralToken.address))
        .to.emit(factory, "CreatePair")
        .withArgs(assetToken.address, collateralToken.address, pairContractAddress);

      proxyContract = creditPairFactoryV1.attach(pairContractAddress) as CreditPair;
    });
    it("Upgrade the Pair contract with owner", async () => {
      const creditPairFactoryV2 = await ethers.getContractFactory("CreditPairV2", {
        libraries: { CreditMath: creditMathContractAddress },
      });
      const creditPairV2 = await creditPairFactoryV2.deploy();
      await expect(
        signers[0].sendTransaction({
          to: pairContractAddress,
          data: creditPairV2.interface.encodeFunctionData("newMethod", []),
        })
      ).to.be.reverted;

      await upgradeableBeacon.upgradeTo(creditPairV2.address);
      proxyContract = creditPairFactoryV2.attach(pairContractAddress) as CreditPairV2;

      expect(await upgradeableBeacon.implementation()).to.be.equal(creditPairV2.address);
      expect(await proxyContract.newMethod()).to.be.equal(1);

      expect(await proxyContract.factory()).to.be.equal(factory.address);
      expect(await proxyContract.asset()).to.be.equal(assetToken.address);
      expect(await proxyContract.collateral()).to.be.equal(collateralToken.address);
      expect((await proxyContract.lpFee()).toString()).to.be.equal(Constants.FEE.toString());
      expect((await proxyContract.protocolFee()).toString()).to.be.equal(Constants.PROTOCOL_FEE.toString());

      expect(await factory.getPair(assetToken.address, collateralToken.address)).to.be.equal(pairContractAddress);
    });

    it("Upgrade the Math library with owner", async () => {
      const creditPairFactoryV2 = await ethers.getContractFactory("CreditPairV2", {
        libraries: { CreditMath: creditMathContractAddress },
      });
      const creditPairV2 = await creditPairFactoryV2.deploy();

      await upgradeableBeacon.upgradeTo(creditPairV2.address);
      proxyContract = creditPairFactoryV2.attach(pairContractAddress) as CreditPairV2;

      const maturity = (await now()) + 10000n;
      const state: IPair.StateStruct = {
        reserves: { asset: 0n, collateral: 0n },
        lpFeeStored: 1n,
        totalLiquidity: 0n,
        totalClaims: { loanPrincipal: 0n, loanInterest: 0n, coverageInterest: 0n, coveragePrincipal: 0n },
        totalDebtCreated: 0n,
        x: 100n,
        y: 10n,
        z: 1n,
      };
      let assetIn: bigint = 1000n;
      let interestIncrease: bigint = 30n;
      let cdpIncrease: bigint = 2n;

      const reference = await proxyContract.newMethodCallingLib(
        maturity,
        state,
        assetIn,
        interestIncrease,
        cdpIncrease
      );

      const creditMathFactoryV2 = await ethers.getContractFactory("CreditMathV2");
      const creditMathContractAddressv2 = (await creditMathFactoryV2.deploy()).address;

      const creditPairFactoryV3 = await ethers.getContractFactory("CreditPairV2", {
        libraries: { CreditMath: creditMathContractAddressv2 },
      });
      const creditPairV3 = await creditPairFactoryV3.deploy();

      await upgradeableBeacon.upgradeTo(creditPairV3.address);

      const newResult = await proxyContract.newMethodCallingLib(
        maturity,
        state,
        assetIn,
        interestIncrease,
        cdpIncrease
      );

      expect(newResult[0]).to.be.equal(10n).and.to.not.be.equal(reference[0]);
      expect(newResult[1][0]).to.be.equal(1n).and.to.not.be.equal(reference[1][0]);
    });

    it("Upgrade and introduce new storage variable", async () => {
      const creditPairFactoryV2 = await ethers.getContractFactory("CreditPairV2Storage", {
        libraries: { CreditMath: creditMathContractAddress },
      });
      const creditPairV2 = await creditPairFactoryV2.deploy();
      await upgradeableBeacon.upgradeTo(creditPairV2.address);
      proxyContract = creditPairFactoryV2.attach(pairContractAddress) as CreditPairV2Storage;
      await proxyContract.initializeV2(5);
      expect(await proxyContract.newValue()).to.be.equal(5);
      expect(await proxyContract.factory()).to.be.equal(factory.address);
      expect(await proxyContract.asset()).to.be.equal(assetToken.address);
      expect(await proxyContract.collateral()).to.be.equal(collateralToken.address);
      expect((await proxyContract.lpFee()).toString()).to.be.equal(Constants.FEE.toString());
      expect((await proxyContract.protocolFee()).toString()).to.be.equal(Constants.PROTOCOL_FEE.toString());

      await expect(proxyContract.initializeV2(4)).to.be.revertedWith("CreditPairV2Storage: V2 already initialized");
    });

    it("Upgrade by a non-owner signer should fail", async () => {
      const creditPairFactoryV2 = await ethers.getContractFactory("CreditPairV2", {
        libraries: { CreditMath: creditMathContractAddress },
      });
      const creditPairV2 = await creditPairFactoryV2.deploy();
      await expect(upgradeableBeacon.connect(signers[1]).upgradeTo(creditPairV2.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("Try to call initialize() a second time should fail", async () => {
      const creditPairFactoryV2 = await ethers.getContractFactory("CreditPairV2", {
        libraries: { CreditMath: creditMathContractAddress },
      });
      const creditPairV2 = await creditPairFactoryV2.deploy();
      await expect(upgradeableBeacon.connect(signers[1]).upgradeTo(creditPairV2.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );

      await expect(
        proxyContract.initialize(
          await ethers.Wallet.createRandom().getAddress(),
          await ethers.Wallet.createRandom().getAddress(),
          3,
          4,
          5
        )
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });
  });
});

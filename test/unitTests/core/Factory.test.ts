import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { ethers, waffle } from "hardhat";
import { factoryInit } from "../../utils/shared/Factory";
import { pseudoRandomBigUint } from "../../utils/shared/Helper";

const { solidity } = waffle;
chai.use(solidity);
const { expect } = chai;

const MaxUint16 = BigNumber.from(2).pow(16).sub(1);

describe("Core#Factory", () => {
  describe("Contract", () => {
    let signers: SignerWithAddress[];
    let factory: Contract;
    let fee: bigint;
    let protocol_fee: bigint;
    let staking_fee: bigint;

    beforeEach(async () => {
      signers = await ethers.getSigners();
      fee = pseudoRandomBigUint(MaxUint16);
      protocol_fee = pseudoRandomBigUint(MaxUint16);
      staking_fee = pseudoRandomBigUint(MaxUint16);
      let creditMathFactory = await ethers.getContractFactory("CreditMath");
      let creditMathContract = await creditMathFactory.deploy();
      factory = await factoryInit(
        signers[10].address,
        signers[10].address,
        signers[10].address,
        creditMathContract.address,
        fee,
        protocol_fee,
        staking_fee
      ); // deploying the factory
    });

    it("Set Pair creator", async () => {
      // setting new owner and emitting event
      await expect(factory.connect(signers[0]).setPairCreator(signers[1].address))
        .to.emit(factory, "SetPairCreator")
        .withArgs(signers[1].address);

      const currentPairCreator = await factory.pairCreator();
      const expectedPairCreator = signers[1].address;
      expect(currentPairCreator).to.equal(expectedPairCreator);
    });

    it("Set Pair creator from non owner", async () => {
      await expect(factory.connect(signers[9]).setPairCreator(signers[1].address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("Deployment", async () => {
    it("Deploying factory with zero address: Reverted", async () => {
      let creditMathFactory = await ethers.getContractFactory("CreditMath");
      let creditMathContract = await creditMathFactory.deploy();
      await expect(
        factoryInit(
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          creditMathContract.address,
          undefined,
          undefined,
          undefined
        )
      ).to.be.revertedWith("E101");
    });

    it("Deploying factory with fee greater than uint16: Reverted", async () => {
      let creditMathFactory = await ethers.getContractFactory("CreditMath");
      let creditMathContract = await creditMathFactory.deploy();
      await expect(
        factoryInit(
          undefined,
          undefined,
          undefined,
          creditMathContract.address,
          BigInt(MaxUint16.add(1).toString()),
          undefined,
          undefined
        ),
        undefined
      ).to.be.reverted;
    });

    it("Deploying factory with protocolfee greater than uint16: Reverted", async () => {
      let creditMathFactory = await ethers.getContractFactory("CreditMath");
      let creditMathContract = await creditMathFactory.deploy();
      await expect(
        factoryInit(
          undefined,
          undefined,
          undefined,
          creditMathContract.address,
          BigInt(MaxUint16.add(1).toString()),
          undefined,
          undefined
        )
      ).to.be.reverted;
    });

    it("Deploying factory with negative fee: Reverted", async () => {
      let creditMathFactory = await ethers.getContractFactory("CreditMath");
      let creditMathContract = await creditMathFactory.deploy();
      await expect(factoryInit(undefined, undefined, undefined, creditMathContract.address, -1n, undefined, undefined))
        .to.be.reverted;
    });

    it("Deploying factory with negative protocolfee: Reverted", async () => {
      let creditMathFactory = await ethers.getContractFactory("CreditMath");
      let creditMathContract = await creditMathFactory.deploy();
      await expect(factoryInit(undefined, undefined, undefined, creditMathContract.address, undefined, -1n, undefined))
        .to.be.reverted;
    });

    it("Deploying factory with 0 fee: reverted", async () => {
      let signerAddress = await ethers.getSigners();
      let creditMathFactory = await ethers.getContractFactory("CreditMath");
      let creditMathContract = await creditMathFactory.deploy();
      await expect(factoryInit(undefined, undefined, undefined, creditMathContract.address, 0n, undefined, undefined))
        .to.be.reverted;
    });

    it("Deploying factory with 0 protocol fee: reverted", async () => {
      let signerAddress = await ethers.getSigners();
      let creditMathFactory = await ethers.getContractFactory("CreditMath");
      let creditMathContract = await creditMathFactory.deploy();
      await expect(factoryInit(undefined, undefined, undefined, creditMathContract.address, undefined, 0n, undefined))
        .to.be.reverted;
    });
  });
});

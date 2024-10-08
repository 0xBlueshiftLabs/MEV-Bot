import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { ethers, waffle } from "hardhat";
import { CreditToken } from "../../../typechain";

const { solidity } = waffle;
chai.use(solidity);
const { expect } = chai;

const maxSupply = ethers.utils.parseEther("1000000");

describe("unit tests", () => {
  let owner: SignerWithAddress;
  let creditToken: CreditToken;

  before(async () => {
    [owner] = await ethers.getSigners();
  });

  beforeEach(async () => {
    const CreditToken = await ethers.getContractFactory("CreditToken");
    creditToken = (await CreditToken.deploy()) as CreditToken;
  });

  describe("Credit", () => {
    describe("initialization", () => {
      it("when contract deployment then initializer get total supply minted", async () => {
        // WHEN
        await creditToken.initialize("Credit", "CREDIT");
        await creditToken.mint(owner.address, ethers.utils.parseEther("450000"));

        // THEN
        expect(await creditToken.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("450000"));
        expect(await creditToken.MAX_SUPPLY()).to.be.eq(maxSupply);
      });

      it("given contract init when init deployment then throw", async () => {
        // GIVEN
        await creditToken.initialize("Credit", "CREDIT");
        await creditToken.mint(owner.address, ethers.utils.parseEther("450000"));

        // WHEN + THEN
        await expect(creditToken.initialize("CreditToken", "CREDIT")).to.be.revertedWith(
          "Initializable: contract is already initialized"
        );
      });

      it("when set distributor then distributor modified", async () => {
        // GIVEN
        await creditToken.initialize("Credit", "CREDIT");
        await creditToken.mint(owner.address, ethers.utils.parseEther("450000"));

        // WHEN
        await creditToken.setDistributor((await ethers.getSigners())[1].address);

        // THEN
        expect(await creditToken.distributor()).to.equal((await ethers.getSigners())[1].address);
      });
    });

    describe("mint", () => {
      it("when mint then to received token", async () => {
        // GIVEN
        await creditToken.initialize("Credit", "CREDIT");
        await creditToken.mint(owner.address, ethers.utils.parseEther("450000"));

        // WHEN
        await creditToken.mint((await ethers.getSigners())[1].address, ethers.utils.parseEther("10"));

        // THEN
        expect(await creditToken.balanceOf((await ethers.getSigners())[1].address)).to.be.eq(
          ethers.utils.parseEther("10")
        );
      });

      it("given non distributor when mint then throws", async () => {
        // GIVEN
        await creditToken.initialize("Credit", "CREDIT");
        await creditToken.mint(owner.address, ethers.utils.parseEther("450000"));

        // WHEN + THEN
        await expect(
          creditToken
            .connect((await ethers.getSigners())[1])
            .mint((await ethers.getSigners())[1].address, ethers.utils.parseEther("10"))
        ).to.be.revertedWith("Credit: not distributor");
      });

      it("given amount+totalsupply>maxsupply when mint then only mint what it can", async () => {
        // GIVEN
        await creditToken.initialize("Credit", "CREDIT");
        await creditToken.mint(owner.address, ethers.utils.parseEther("450000"));

        creditToken.mint((await ethers.getSigners())[1].address, ethers.utils.parseEther("500000"));

        // WHEN
        await creditToken.mint((await ethers.getSigners())[2].address, ethers.utils.parseEther("100000"));

        // THEN
        expect(await creditToken.balanceOf((await ethers.getSigners())[2].address)).to.be.eq(
          ethers.utils.parseEther("50000")
        );
      });
    });
  });
});

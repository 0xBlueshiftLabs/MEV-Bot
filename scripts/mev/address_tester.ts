import "@nomiclabs/hardhat-ethers";
import * as fs from "fs";
import "hardhat-deploy";
import { task } from "hardhat/config";
import path from "path";
/*
import { getAssetOut } from "../../test/unitTests/MEV/helpers/AssetOutSearcher";
import { givenPercent } from "../../test/unitTests/MEV/helpers/BorrowMath";
import { borrow } from "../../test/unitTests/MEV/helpers/CreditMath";
*/

const addressTester: () => void = () => {
  task("addressTester", "Return uniswap pair addresses given factory").setAction(async (taskArgs, hardhatRuntime) => {
    // const arbAddress = "0xeDAd8F039b630c9F7b3C436B741a1327614BeaD1"; // test ARB on Arb Goerli
    // const usdcAddress = "0xCD271697983Ca096E18DBed0D95e64BDFceb1Bfc"; // test USDC on Arb Goerli
    // const wethAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1"; // test WETH on Arb Goerli

    // const uniV2FactoryAddress = "0x67318a4795D50FB902312f2184951b3a2517968a";

    // const dir = path.resolve(__dirname, "./UniV2Factory.json");
    // const file = fs.readFileSync(dir, "utf8");
    // const json = JSON.parse(file);
    // const abi = json.abi;

    // const uniV2Factory = await hardhatRuntime.ethers.getContractAt(abi, uniV2FactoryAddress);

    // console.log(await uniV2Factory.factory(usdcAddress, wethAddress));

    // await uniV2Factory.getPair(usdcAddress, wethAddress).then((pairAddress) => {
    //   console.log("USDC/WETH pair address: " + pairAddress);
    // });

    // await uniV2Factory.getPair(arbAddress, wethAddress).then((pairAddress) => {
    //   console.log("ARB/WETH pair address: " + pairAddress);
    // });

    const uniV2RouterAddress = "0xc91d8ceb65482a352bea757cefa32c745213217b";

    // getting uniV2Pair instance
    const dir = path.resolve(__dirname, "./UniswapV2Router.json");
    const file = fs.readFileSync(dir, "utf8");
    const json = JSON.parse(file);
    const abi = json.abi;
    const uniV2Router = await hardhatRuntime.ethers.getContractAt(abi, uniV2RouterAddress);

    console.log(await uniV2Router.WETH());
  });
};
export { addressTester };

// factory on arb goerli 0x0BE78da316a0804319EEf493E69731BF49D98FAa
// potentially a Router but probably a pair 0xc91d8ceb65482a352bea757cefa32c745213217b

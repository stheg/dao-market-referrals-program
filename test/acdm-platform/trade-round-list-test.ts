import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ACDMPlatform, IERC20MintableBurnable, IUniswapV2Pair, ReferralProgram, StakingPlatform } from "../../typechain-types";
import { testDeployERC20, deployACDMPlatform } from "../../scripts/test-deployment";
import { provideLiquidityForTests } from "../../scripts/provide-liquidity";
import { BigNumber } from "ethers";
import { delay } from "../../scripts/misc";

describe("list in sale round", () => {
    let accounts: SignerWithAddress[];
    let owner: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;
    let contract: ACDMPlatform;
    let stakingToken: IUniswapV2Pair;
    let rewardToken: IERC20MintableBurnable;
    let acdmToken: IERC20MintableBurnable;

    beforeEach(async () => {
        accounts = await ethers.getSigners();
        owner = accounts[0];
        user1 = accounts[1];
        user2 = accounts[2];

        acdmToken = await testDeployERC20("ACDM", 8, owner);

        [stakingToken, rewardToken] = await provideLiquidityForTests(user2, owner);

        contract = await deployACDMPlatform(
            acdmToken.address,
            stakingToken.address, 
            rewardToken.address, 
            owner
        );
        contract = contract.connect(user2);

        await acdmToken.mint(contract.address, 100000);
    });

    it("list reverts if not trade round", async () => {
        const tx = contract.connect(user1).list(100, 100);
        await expect(tx).to.be.revertedWith("ItIsNotTradeRound");
    });

    it("list reverts if trade round finished", async () => {
        await delay(await contract.getRoundDuration(), 30);
        await contract.finishRound();
        await delay(await contract.getRoundDuration(), 30);
        const tx = contract.connect(user1).list(100, 100);
        await expect(tx).to.be.revertedWith("ItIsNotTradeRound");
    });

    it("list changes token balances", async () => {
        const amount = 100;
        const price = await contract.getSaleRoundPrice();
        const totalPrice = price.mul(amount);
        
        await contract.connect(user1).buy(amount, { value: totalPrice });        
        await delay(await contract.getRoundDuration(), 30);
        await contract.finishRound();
        await delay(BigNumber.from(30), 30);

        await acdmToken.connect(user1).approve(contract.address, amount);
        const tx = contract.connect(user1).list(amount, price);
        await expect(() => tx).to.changeTokenBalances(
            acdmToken, [user1, contract], [-amount, amount]
        );
    });

    it("list registers new listing from seller", async () => {
        const amount = 100;
        const price = await contract.getSaleRoundPrice();
        const totalPrice = price.mul(amount);

        await contract.connect(user1).buy(amount, { value: totalPrice });
        await delay(await contract.getRoundDuration(), 30);
        await contract.finishRound();
        await delay(BigNumber.from(30), 30);

        await acdmToken.connect(user1).approve(contract.address, amount);
        await contract.connect(user1).list(amount, price);
        const listing = await contract.getListingDetails(user1.address, 0);
        expect(listing.amount).eq(amount);
        expect(listing.price).eq(price);
    });
});

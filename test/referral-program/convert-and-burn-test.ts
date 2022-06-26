import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ACDMPlatform, IERC20MintableBurnable, IUniswapV2Pair, ReferralProgram, StakingPlatform } from "../../typechain-types";
import { deployERC20Token, deployACDMPlatform } from "../../scripts/test-deployment";
import { getRouter, provideLiquidityForTests } from "../../scripts/provide-liquidity";
import { BigNumber } from "ethers";
import { delay } from "../../scripts/misc";

describe("apply referrals program", () => {
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

        acdmToken = await deployERC20Token("ACDM", 8, owner);

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
    
    it("convertAndBurn reverts if no required role", async () => {
        const amount = 1000;
        const price = await contract.getSaleRoundPrice();
        const totalPrice = price.mul(amount);

        await contract.connect(user2).buy(amount, { value: totalPrice });
        await delay(await contract.getRoundDuration(), 30);
        await contract.finishRound();
        await delay(BigNumber.from(30), 30);
        await acdmToken.connect(user2).approve(contract.address, amount);
        await contract.connect(user2).list(amount, price);

        const r = await getRouter(owner);
        const tx = contract.connect(owner).convertAndBurn(r.address, rewardToken.address, 60);

        await expect(tx).to.be.reverted;
    });

    it("convertAndBurn should change ether balance", async () => {
        const amount = 1000;
        const price = await contract.getSaleRoundPrice();
        const totalPrice = price.mul(amount);

        await contract.connect(user2).buy(amount, { value: totalPrice });
        await delay(await contract.getRoundDuration(), 30);
        await contract.finishRound();
        await delay(BigNumber.from(30), 30);
        await acdmToken.connect(user2).approve(contract.address, amount);
        await contract.connect(user2).list(amount, price);

        await contract.connect(owner).grantRole(
            await contract.CONFIGURATOR_ROLE(),
            owner.address
        );

        const platformBonus = await contract.getAccumulatedPlatformBonus();
        const r = await getRouter(owner);
        const [wethAmount, rewardTokenAmount] = await r.getAmountsOut(platformBonus, [await r.WETH(), rewardToken.address]);
        const tx = contract.connect(owner).convertAndBurn(r.address, rewardToken.address, 60);

        await expect(() => tx).to.changeEtherBalance(
            contract,
            platformBonus.mul(-1)
        );
    });
});

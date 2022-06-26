import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ACDMPlatform, IERC20MintableBurnable, IUniswapV2Pair, ReferralProgram, StakingPlatform } from "../../typechain-types";
import { deployERC20Token, deployACDMPlatform } from "../../scripts/test-deployment";
import { provideLiquidityForTests } from "../../scripts/provide-liquidity";
import { BigNumber } from "ethers";

describe("admin functions", () => {
    let accounts: SignerWithAddress[];
    let owner: SignerWithAddress;
    let erc20Owner: SignerWithAddress;
    let staker: SignerWithAddress;
    let contract: ACDMPlatform;
    let stakingToken: IUniswapV2Pair;
    let rewardToken: IERC20MintableBurnable;
    let acdmToken: IERC20MintableBurnable;

    beforeEach(async () => {
        accounts = await ethers.getSigners();
        erc20Owner = accounts[0];
        owner = accounts[1];
        staker = accounts[2];

        acdmToken = await deployERC20Token("ACDM", 8, erc20Owner);

        [stakingToken, rewardToken] = await provideLiquidityForTests(staker, erc20Owner);

        contract = await deployACDMPlatform(
            acdmToken.address,
            stakingToken.address, 
            rewardToken.address, 
            owner
        );
        contract = contract.connect(staker);
        await contract.getACDMToken();
    });

    it("setRoundDuration reverts if no correct role", async () => {
        const tx = contract.setRoundDuration(1000);
        await expect(tx).to.be.reverted;
    });

    it("setRoundDuration works", async () => {
        await contract.connect(owner).grantRole(await contract.CONFIGURATOR_ROLE(), owner.address);
        const tx = contract.connect(owner).setRoundDuration(1000);
        await expect(tx).to.not.be.reverted;
    });
});

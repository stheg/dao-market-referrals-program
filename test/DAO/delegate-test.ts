import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { deployMockContract, MockContract } from "@ethereum-waffle/mock-contract";
import { ethers } from "hardhat";
import { DAO, IERC20__factory } from "../../typechain-types";

describe("MA DAO", () => {
    let chairperson: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;
    let contract: DAO;
    let voteToken: MockContract;
    let callData: string;

    const proposalId = 1;
    
    beforeEach(async () => {
        [chairperson, user1, user2] = await ethers.getSigners();
        voteToken = await deployMockContract(chairperson, IERC20__factory.abi);
        await voteToken.mock.transferFrom.returns(true);
        
        const f = await ethers.getContractFactory("DAO", chairperson);
        contract = <DAO>await f.deploy(chairperson.address, voteToken.address, voteToken.address);

        callData = IERC20__factory.createInterface().encodeFunctionData(
            "transferFrom", 
            [contract.address, chairperson.address, 1000]
        );

        await contract.deployed();

        await contract.addProposal(
            voteToken.address,
            callData,
            "transfer 1000 vote tokens to chairperson"
        );
    })

    describe("delegate", () => {
        it("should work", async () => {
            await contract.connect(user1).stake(1000);
            await contract.connect(user1).delegate(user2.address, proposalId);
        });

        it("should use delegated votes in voting", async () => {
            const amount = 1000;
            await contract.connect(user1).stake(amount);
            await contract.connect(user2).stake(amount);
            
            await contract.connect(user2).delegate(user1.address, proposalId);
            await contract.connect(user1).vote(proposalId, true);

            const p = await contract.getProposal(proposalId);
            expect(p.votesFor).eq(amount*2);
        });

        it("should be reverted if no deposit", async () => {
            const tx = contract.connect(user1).delegate(user2.address, proposalId);
            await expect(tx).to.be.revertedWith("DAO: no deposit");
        });

        it("should be reverted if voted already", async () => {
            await contract.connect(user1).stake(1000);
            await contract.connect(user1).vote(proposalId, true);

            const tx = contract.connect(user1).delegate(user2.address, proposalId);
            await expect(tx).to.be.revertedWith("DAO: voted already");
        });

        it("should be reverted if a delegate voted already", async () => {
            await contract.connect(user1).stake(1000);
            await contract.connect(user2).stake(1000);
            await contract.connect(user2).vote(proposalId, true);

            const tx = contract.connect(user1).delegate(user2.address, proposalId);
            await expect(tx).to.be.revertedWith("DAO: delegate voted already");
        });

        it("should be reverted if delegated already", async () => {
            await contract.connect(user1).stake(1000);
            await contract.connect(user1).delegate(chairperson.address, proposalId);

            const tx = contract.connect(user1).delegate(user2.address, proposalId);
            await expect(tx).to.be.revertedWith("DAO: voted already");
        });

        it("should be reverted if voting doesn't exist", async () => {
            const tx1 = contract.connect(user1).delegate(user2.address, 123);
            await expect(tx1).to.be.revertedWith("DAO: no such voting");

            const tx2 = contract.connect(user1).delegate(user2.address, 0);
            await expect(tx2).to.be.revertedWith("DAO: no such voting");
        });
    });
});
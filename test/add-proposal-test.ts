import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { deployMockContract, MockContract } from "@ethereum-waffle/mock-contract";
import { ethers } from "hardhat";

describe("MA DAO", () => {
    let chairperson: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;
    //let contract: MADAO;
    let voteToken: MockContract;
    let callData: string;
    
    beforeEach(async () => {
        [chairperson, user1, user2] = await ethers.getSigners();
        //voteToken = await deployMockContract(chairperson, IERC20__factory.abi);

        const f = await ethers.getContractFactory("MADAO", chairperson);
        const duration = 3 * 24 * 60 * 60;// 3 days in seconds
        //contract = <MADAO>await f.deploy(chairperson.address, voteToken.address, 1000, duration);

        // callData = IERC20__factory.createInterface().encodeFunctionData(
        //     "transferFrom", 
        //     [contract.address, chairperson.address, 1000]
        // );

        // await contract.deployed();
        // await contract.getVoteToken();
    })

    describe("addProposal", () => {
        it("should work", async () => {
            // const description = "transfer 1000 vote tokens to chairperson";
            
            // await contract.addProposal(
            //     voteToken.address, 
            //     callData, 
            //     description
            // );

            // const p = await contract.getProposal(1);
            // expect(p.recipient).eq(voteToken.address);
            // expect(p.funcSignature).eq(callData);
            // expect(p.description).eq(description);
        });

        it("should be reverted", async () => {
            // const tx = contract.connect(user1).addProposal(
            //     voteToken.address,
            //     callData,
            //     "no matter"
            // );
            // await expect(tx).to.be.revertedWith("MADAO: no access");
        });
    });
});
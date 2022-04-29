let { expect } = require("chai");
let hre = require("hardhat");
let {ethers} = hre;
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { Signer, Contract, ContractFactory, BigNumber } from "ethers";
let Web3 = require("web3");
let {getProposal, TProrosal, signatures, ProposalFabric} = require("./utils");

describe("Testing DAO2 contract", async function () {

  let web3: any;
  hre.Web3 = Web3;
  hre.web3 = new Web3(hre.network.provider);
  web3 = hre.web3;

  let owner: SignerWithAddress, user1: SignerWithAddress, user2: SignerWithAddress, user3: SignerWithAddress,
  ERC20: ContractFactory, erc20: Contract,
  DAO: ContractFactory, dao: Contract,
  EXP: ContractFactory, exp: Contract,
  proposal_duration: number = 259200,
  zeroAddress: string = "0x0000000000000000000000000000000000000000",
  my_votes: string = String(Number(10**18));

  async function mintAndAapproveERC20ToDAO(from:SignerWithAddress, amount: string):Promise<void> {
    await erc20.connect(owner).mint(from.address, amount);
    await erc20.connect(from).approve(dao.address, amount);
  }

  async function increaseTime(time:any) {
        await web3.currentProvider._sendJsonRpcRequest({
          jsonrpc: '2.0',
          method: 'evm_increaseTime',
          params: [time],
          id: 0,
        }, () => {console.log("increace done!")});
        await web3.currentProvider._sendJsonRpcRequest({
          jsonrpc: '2.0',
          method: 'evm_mine',
          params: [],
          id: 0,
        }, () => {console.log("mining done!")});
        }

  beforeEach(async()=>{

    [owner, user1, user2, user3] = await ethers.getSigners();

    ERC20 = await ethers.getContractFactory("MyERC20");
    erc20 = await ERC20.connect(owner).deploy();
    await erc20.deployed();

    DAO = await ethers.getContractFactory("DAO2");
    dao = await DAO.connect(owner).deploy(erc20.address, owner.address, proposal_duration);
    await dao.deployed();

    EXP = await ethers.getContractFactory("Experimental");
    exp = await EXP.connect(owner).deploy(dao.address);
    await exp.deployed();

  })


  it("Testing setMinQuorum function", async function () {
    let minQ:string = "80";
    expect(await dao.minimumQuorum()).to.equal("40");
    await dao.connect(owner).setMinQuorum(minQ);
    expect(await dao.minimumQuorum()).to.equal(minQ);
  });

  it("Testing set votes duration", async()=>{
    let new_duration: string = String(Number(proposal_duration)*2);
    expect(await dao.voteDuration()).to.equal(proposal_duration);
    await dao.connect(owner).setVoteDuration(new_duration);
    expect(await dao.voteDuration()).to.equal(new_duration);
  })

  it("Testing set new Chairnman function", async()=>{
    expect(await dao.chairman()).to.equal(owner.address);
    await dao.connect(owner).setNewChairman(user1.address);
    expect(await dao.chairman()).to.equal(user1.address);
  })

  it("Testing addProposal funtion", async()=>{
    let phrase: string = "Some phrase";
    let description: string = `Change phrase on Experimental contract to ${phrase}`;
    let signature: string = signatures.setPhrase([phrase]);
    let expObj = {
  signature: signature,
  recepient: exp.address,
  description,
  rejectVotes: '0',
  resolveVotes: '0',
  duration: String(proposal_duration)
};
    await dao.connect(owner).addProposal(signature, exp.address, description);
    expect(getProposal(await dao.proposals(1))).to.deep.equal(expObj);
  })

  it("Testing vote function", async()=>{

    let phrase: string = "Some phrase";
    let description: string = `Change phrase on Experimental contract to ${phrase}`;
    let signature: string = signatures.setPhrase([phrase]);
    await dao.connect(owner).addProposal(signature, exp.address, description);

    await mintAndAapproveERC20ToDAO(owner, my_votes);

    await dao.connect(owner).deposit(my_votes);

    await dao.connect(owner).vote(1,true);
    let prop = await dao.proposals(1);
    expect(String(prop.resolveVotes)).to.equal(my_votes);
  })

it("Testing all cases of finish function. Execution case", async()=>{
  await mintAndAapproveERC20ToDAO(owner, my_votes);
  await mintAndAapproveERC20ToDAO(user1, my_votes);
  await mintAndAapproveERC20ToDAO(user2, my_votes);
  await mintAndAapproveERC20ToDAO(user3, my_votes);
  let phrase: string = "Some phrase";
  let description: string = `Change phrase on Experimental contract to ${phrase}`;
  let signature: string = signatures.setPhrase([phrase]);
  await dao.connect(owner).addProposal(signature, exp.address, description);
//////////////
  console.log("Trying to finish while time isn't run out!");
  let err_mess: string = "Error: Can`t finish this proposal yet!";
  await expect(dao.finish(1)).to.be.revertedWith(err_mess);
///////////////
  await increaseTime(proposal_duration);
  await dao.connect(user1).deposit(my_votes);
  await dao.connect(user2).deposit(my_votes);
  await dao.connect(user1).vote(1,true);
  await dao.connect(user2).vote(1,false);
///////////////
  console.log("Trying to finish while `resolveVotes` equals to `rejectVotes`!");
  err_mess = "Error: Can`t finish this proposal while `resolve votes` amount is equals to `reject votes` amount!";
  await expect(dao.finish(1)).to.be.revertedWith(err_mess);
//////////////
  console.log("Trying to finish while amount of voting tokns is lower than `minimumQuorum` value!");
  err_mess = "Error: Can`t finish this proposal while enough tokens not used in vote";
  await mintAndAapproveERC20ToDAO(owner, String(Number(my_votes)*10));
  await dao.connect(owner).deposit(my_votes);
  await dao.connect(owner).vote(1,true);
  await expect(dao.finish(1)).to.be.revertedWith(err_mess);


  expect(await exp.phrase()).to.equal("Hello");

  await mintAndAapproveERC20ToDAO(user3, String(Number(my_votes)*20));
  await dao.connect(user3).deposit(String(Number(my_votes)*20));

  await increaseTime(proposal_duration);


  await dao.connect(user3).vote(1,true);

  await dao.finish(1);

  let new_phrase = await exp.phrase();
  expect(new_phrase).to.equal(phrase);

})

it("Testing finish function. Reject case", async()=>{
  await mintAndAapproveERC20ToDAO(owner, my_votes);
  await mintAndAapproveERC20ToDAO(user1, my_votes);

  let phrase: string = "Some phrase";
  let description: string = `Change phrase on Experimental contract to ${phrase}`;
  let signature: string = signatures.setPhrase([phrase]);
  await dao.connect(owner).addProposal(signature, exp.address, description);

  await increaseTime(proposal_duration);

  await dao.connect(user1).deposit(String(Number(my_votes)*0.7));
  await dao.connect(owner).deposit(my_votes);
  await dao.connect(user1).vote(1,true);
  await dao.connect(owner).vote(1,false);

  await expect(dao.finish(1)).to.emit(dao, "ProposalFinished").withArgs("1", 1, owner.address);

  expect(phrase).to.equal(phrase);
  let proposal: any = await dao.proposals(1);
  expect(proposal.signature).to.equal("0x");
})

  it("Testing finish function when execution error occurs!", async()=>{
    await mintAndAapproveERC20ToDAO(owner, my_votes);
    await mintAndAapproveERC20ToDAO(user1, my_votes);

    let phrase: string = "Secret";
    let description: string = `Set secret: ${phrase}`;
    let signature: string = signatures.setSecret([phrase]);
    await dao.connect(owner).addProposal(signature, exp.address, description);

    await increaseTime(proposal_duration);

    await dao.connect(user1).deposit(String(Number(my_votes)*0.7));
    await dao.connect(owner).deposit(my_votes);
    await dao.connect(user1).vote(1,false);
    await dao.connect(owner).vote(1,true);


    await expect(dao.finish(1)).to.emit(dao, "ProposalFinished").withArgs("1", 2, owner.address);

  })

  it("Testing all cases of withdraw function.", async()=>{
    await mintAndAapproveERC20ToDAO(owner, my_votes);
    await dao.connect(owner).deposit(my_votes);

    let phrase: string = "Some phrase";
    let description: string = `Change phrase on Experimental contract to ${phrase}`;
    let signature: string = signatures.setPhrase([phrase]);
    await dao.connect(owner).addProposal(signature, exp.address, description);
    await dao.connect(owner).vote(1,true);
///////////////
    console.log("Trying to withdraw while on voting");
    let err_mess: string = "Error: Cannot withdraw while you are on auction!";
    await expect(dao.connect(owner).withdraw()).to.be.revertedWith(err_mess);
//////////////
    await increaseTime(proposal_duration);

    await dao.finish(1)
    expect(String(await erc20.balanceOf(owner.address))).to.equal("0")

    await dao.connect(owner).withdraw();
    expect(String(await erc20.balanceOf(owner.address))).to.equal(my_votes)
////////////////
    console.log("Trying to withdra having no tokens on deposit")
    err_mess = "Error: You have no deposit on this contract!";
    await expect(dao.connect(owner).withdraw()).to.be.revertedWith(err_mess);
///////////////
  })


  describe("Testing errors", async()=>{

    it("Trying to setMinQuorum as 0 or bigger than 100", async()=>{
      let err_mess: string = "Error: Invalid minimum quorum value!";
      await expect(dao.connect(owner).setMinQuorum("0")).to.be.revertedWith(err_mess);
      await expect(dao.connect(owner).setMinQuorum("101")).to.be.revertedWith(err_mess);
    })

    it("Trying to setMinQuorum as 0 or bigger than 100", async()=>{
      let err_mess: string = "Error: Address of new chairman is equal to old one`s address!";
      await expect(dao.connect(owner).setNewChairman(owner.address)).to.be.revertedWith(err_mess);
      err_mess = "Error: New chairman is zero address!";
      await expect(dao.connect(owner).setNewChairman(zeroAddress)).to.be.revertedWith(err_mess);
    })

    it("Testing addProposal function, sending recepient as zero address", async()=>{
      let err_mess: string = "Error: Zero address of recepient!";
      let description: string = `Some descr`;
      await expect(dao.connect(owner).addProposal("0x1111", zeroAddress, description)).to.be.revertedWith(err_mess);
    })

    it("Testing addProposal function, sending zero siganture", async()=>{
      let err_mess: string = "Error: Empty signature!";
      let description: string = `Some descr`;
      await expect(dao.connect(owner).addProposal("0x", exp.address, description)).to.be.revertedWith(err_mess);
    })

    it("Testing addProposal function, sending zero siganture", async()=>{
      let err_mess: string = "Error: Proposal with such a signature is already exists!";
      let description: string = `Some descr`;
      await dao.connect(owner).addProposal("0x1111", exp.address, description);
      await expect(dao.connect(owner).addProposal("0x1111", exp.address, description)).to.be.revertedWith(err_mess);
    })

    it("Trying to call finish function while 'proposal duration' isn't run out!", async()=>{
      let phrase: string = "Some phrase";
      let err_mess: string = "Error: Can`t finish this proposal yet!";
      let description: string = `Change phrase on Experimental contract to ${phrase}`;
      let signature: string = signatures.setPhrase([phrase]);
      await dao.connect(owner).addProposal(signature, exp.address, description);
      await expect(dao.finish(1)).to.be.revertedWith(err_mess);
    })

    it("Trying to call deposit function without allowance to DAO contract", async()=>{
      let err_mess: string = "Error: Can not execute deposit function!";
      await expect(dao.connect(owner).deposit(my_votes)).to.be.revertedWith(err_mess);
    })

    it("Trying to vote to not existing proposal", async()=>{
      let err_mess: string = "Error: This proposal doesn`t exist!";
      await expect(dao.connect(owner).vote(1, true)).to.be.revertedWith(err_mess);
    })

    it("Trying to finish not existing proposal", async()=>{
      let err_mess: string = "Error: This proposal doesn`t exist!";
      await expect(dao.finish(1)).to.be.revertedWith(err_mess);
    })

    it("Transfer execution error", async()=>{
      await mintAndAapproveERC20ToDAO(owner, my_votes);
      await dao.connect(owner).deposit(my_votes);

      await erc20.connect(owner).addIntoBlackList(dao.address);

      let err_mess: string = "Error: Can`t execute withdraw function!";
      await expect(dao.connect(owner).withdraw()).to.be.revertedWith(err_mess);
    })

    it("Trying to vote having zero balance", async()=>{
      let phrase: string = "Some phrase";
      let err_mess: string = "Error: Your balance is equals to zero!";
      let description: string = `Change phrase on Experimental contract to ${phrase}`;
      let signature: string = signatures.setPhrase([phrase]);
      await dao.connect(owner).addProposal(signature, exp.address, description);
      await expect(dao.connect(owner).vote(1, true)).to.be.revertedWith(err_mess);
    })

    it("Testing isChairman modifier", async()=>{
      let phrase: string = "Some phrase";
      let err_mess: string = "Error: Only chairman can add proposal!";
      let description: string = `Change phrase on Experimental contract to ${phrase}`;
      let signature: string = signatures.setPhrase([phrase]);
      await expect(dao.connect(user1).addProposal(signature, exp.address, description)).to.be.revertedWith(err_mess);
    })

    it("Trying to vote twice on the same proposal", async()=>{
      let err_mess: string = "Error: Can`t vote twice on the same proposal!";
      await mintAndAapproveERC20ToDAO(owner, my_votes);

      let phrase: string = "Secret";
      let description: string = `Set secret: ${phrase}`;
      let signature: string = signatures.setSecret([phrase]);
      await dao.connect(owner).addProposal(signature, exp.address, description);

      await increaseTime(proposal_duration);

      await dao.connect(owner).deposit(my_votes);
      await dao.connect(owner).vote(1,false);
      await expect(dao.connect(owner).vote(1,true)).to.be.revertedWith(err_mess);
    })

    it("Deposit zero amount", async()=>{
      let err_mess: string = "Error: Zero token amount!";
      await expect(dao.connect(owner).deposit("0")).to.be.revertedWith(err_mess);
    })


  })
});

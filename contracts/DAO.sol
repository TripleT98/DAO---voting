// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract DAO {

    address public token;
    address public chairman;
    uint id = 1;
    uint public vote_duration;
    uint public minimumQuorum = 40;
    uint public totalSuply;

    struct Proposal{
        bytes signature;
        address recepient;
        string description;
        uint256 reject_votes;
        uint256 resolve_votes;
        uint256 start_time;
        uint256 duration;
        mapping (address => uint256) voters;
    }

    enum Status{
        Resolved,
        Rejected,
        ExecutionFail
    }

    mapping (address => uint[]) public userToVotes;
    mapping (uint => Proposal) public proposals;
    mapping (address => uint) public vote_balances;
    mapping (bytes => uint) public signatureToId;

    event ProposalFinished(uint indexed id, Status status, address finisher);

    modifier isExist(uint _id){
        require(proposals[_id].signature.length != 0, "Error: This proposal doesn`t exist!");
        _;
    }

    modifier isChairman(){
      require(msg.sender == chairman, "Error: Only chairman can add proposal!");
      _;
    }

    function setMinQuorum(uint _val) isChairman public {
      require(_val <= 100 && _val != 0, "Error: Invalid minimum quorum value!");
      minimumQuorum = _val;
    }

    function setVoteDuration(uint _val) isChairman public {
      vote_duration = _val;
    }

    function setNewChairman(address _newChairman) isChairman public {
      require(_newChairman != address(0), "Error: New chairman is zero address!");
      require(_newChairman != chairman, "Error: Address of new chairman is equal to old one`s address!");
      chairman = _newChairman;
    }

    constructor(address _token, address _chairman, uint _vote_duration){
        token = _token;
        chairman = _chairman;
        vote_duration = _vote_duration;
        _setTotalSuply();
    }

    function _setTotalSuply() internal {
      (,bytes memory data) = token.call(abi.encodeWithSignature("totalSuply()"));
      totalSuply = abi.decode(data, (uint));
    }

    function addProposal(bytes calldata _signature, address _recepient, string calldata _description) isChairman public {
        require(_signature.length != 0, "Error: Empty signature!");
        require(_recepient != address(0), "Error: Zero address of recepient!");
        require(signatureToId[_signature] == 0, "Error: Proposal with such a signature is already exists!");
        Proposal storage current_proposal = proposals[id];
        current_proposal.signature = _signature;
        current_proposal.start_time = block.timestamp;
        current_proposal.recepient = _recepient;
        current_proposal.description = _description;
        current_proposal.duration = vote_duration;
        signatureToId[_signature] = id;
        id++;
    }


    function vote(uint _id, bool _vote) isExist(_id) public {
        uint _tokenAmount = vote_balances[msg.sender];
        require(_tokenAmount > 0, "Error: Your balance is equals to zero!");
        Proposal storage current_proposal = proposals[_id];
        if(_vote){
            current_proposal.resolve_votes += _tokenAmount;
        }else{
            current_proposal.reject_votes += _tokenAmount;
        }
        current_proposal.voters[msg.sender] += _tokenAmount;
        userToVotes[msg.sender].push(_id);
    }

    function _transferFrom(address _from, address _to, uint _amount) internal returns(bool){
        (bool success,) = token.call(abi.encodeWithSignature("transferFrom(address,address,uint256)", _from, _to, _amount));
        return success;
    }

    function _transfer(address _to, uint _value) internal returns(bool){
        (bool success,) = token.call(abi.encodeWithSignature("transfer(address,uint256)", _to, _value));
        return success;
    }

    function deposit(uint _tokenAmount) public {
        bool success = _transferFrom(msg.sender, address(this), _tokenAmount);
        require(success, "Error: Can not execute deposit function!");
        vote_balances[msg.sender] += _tokenAmount;
    }

    function _execute(Proposal storage _proposal) internal returns (bool success){
        (success,) = _proposal.recepient.call{value:0}(_proposal.signature);
    }

    function finish(uint _id) isExist(_id) public isExist(_id) {
        Proposal storage current_proposal = proposals[_id];
        require(current_proposal.start_time + current_proposal.duration <= block.timestamp, "Error: Can`t finish this proposal yet!");
        require(current_proposal.resolve_votes != current_proposal.reject_votes, "Error: Can`t finish this proposal while `resolve votes` amount is equals to `reject votes` amount!");
        _setTotalSuply();
        require(current_proposal.resolve_votes + current_proposal.reject_votes >= (totalSuply/100)*minimumQuorum, "Error: Can`t finish this proposal while enough tokens not used in vote");
        if(current_proposal.resolve_votes > current_proposal.reject_votes){
            bool success = _execute(current_proposal);
            if(success){
                emit ProposalFinished(_id, Status.Resolved, msg.sender);
            }else{
                emit ProposalFinished(_id, Status.ExecutionFail, msg.sender);
            }
        }else{
            emit ProposalFinished(_id, Status.Rejected, msg.sender);
        }
        delete proposals[_id];

    }

    function isOnVote(address _voter) public returns(bool){
        uint[] storage votes = userToVotes[_voter];
        for(uint i = 0; i < votes.length; i++){
            if(proposals[votes[i]].recepient == address(0)){
                delete votes[i];
            }
        }
        return votes.length == 0;
    }

    function withdraw() public {
        require(isOnVote(msg.sender),"Error: Cannot withdraw while you are on auction!");
        require(vote_balances[msg.sender] != 0, "Error: You have no deposit on this contract!");
        bool success = _transfer(msg.sender,vote_balances[msg.sender]);
        require(success, "Error: Can't execute transfer withdraw function!");
    }

}

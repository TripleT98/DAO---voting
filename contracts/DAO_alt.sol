// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

contract DAO2 {

    address public token;
    address public chairman;
    uint id = 1;
    uint public voteDuration;
    uint public minimumQuorum = 40;
    uint public totalSuply;

    struct Proposal{
        bytes signature;
        address recepient;
        string description;
        uint256 rejectVotes;
        uint256 resolveVotes;
        uint256 startTime;
        uint256 duration;
        mapping (address => uint256) voters;
    }

    enum Status{
        Resolved,
        Rejected,
        ExecutionFail
    }

    mapping (address => uint) public lastVoteForUser;
    mapping (uint => Proposal) public proposals;
    mapping (address => uint) public voteBalances;
    mapping (bytes => uint) public signatureToId;

    event ProposalFinished(uint indexed id, Status status, address finisher);
    event ProposalStarted(uint indexed id, uint indexed timestamp, bytes signature);

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
      voteDuration = _val;
    }

    function setNewChairman(address _newChairman) isChairman public {
      require(_newChairman != address(0), "Error: New chairman is zero address!");
      require(_newChairman != chairman, "Error: Address of new chairman is equal to old one`s address!");
      chairman = _newChairman;
    }

    constructor(address _token, address _chairman, uint _voteDuration){
        token = _token;
        chairman = _chairman;
        voteDuration = _voteDuration;
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
        Proposal storage currentProposal = proposals[id];
        currentProposal.signature = _signature;
        currentProposal.startTime = block.timestamp;
        currentProposal.recepient = _recepient;
        currentProposal.description = _description;
        currentProposal.duration = voteDuration;
        signatureToId[_signature] = id;
        emit ProposalStarted(id, block.timestamp, _signature);
        id++;
    }


    function vote(uint _id, bool _vote) isExist(_id) public {
        uint _tokenAmount = voteBalances[msg.sender];
        require(_tokenAmount > 0, "Error: Your balance is equals to zero!");
        Proposal storage currentProposal = proposals[_id];
        require(currentProposal.voters[msg.sender] == 0, "Error: Can`t vote twice on the same proposal!");
        if(_vote){
            currentProposal.resolveVotes += _tokenAmount;
        }else{
            currentProposal.rejectVotes += _tokenAmount;
        }
        currentProposal.voters[msg.sender] += _tokenAmount;
        uint freezeTime = currentProposal.startTime + currentProposal.duration;
        if(freezeTime > lastVoteForUser[msg.sender]){
          lastVoteForUser[msg.sender] = freezeTime;
        }
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
        require(_tokenAmount > 0, "Error: Zero token amount!");
        bool success = _transferFrom(msg.sender, address(this), _tokenAmount);
        require(success, "Error: Can not execute deposit function!");
        voteBalances[msg.sender] += _tokenAmount;
    }

    function _execute(Proposal storage _proposal) internal returns (bool success){
        (success,) = _proposal.recepient.call{value:0}(_proposal.signature);
    }

    function finish(uint _id) isExist(_id) public {
        Proposal storage currentProposal = proposals[_id];
        require(currentProposal.startTime + currentProposal.duration <= block.timestamp, "Error: Can`t finish this proposal yet!");
        require(currentProposal.resolveVotes != currentProposal.rejectVotes, "Error: Can`t finish this proposal while `resolve votes` amount is equals to `reject votes` amount!");
        _setTotalSuply();
        require(currentProposal.resolveVotes + currentProposal.rejectVotes >= (totalSuply/100)*minimumQuorum, "Error: Can`t finish this proposal while enough tokens not used in vote");
        if(currentProposal.resolveVotes > currentProposal.rejectVotes){
            bool success = _execute(currentProposal);
            Status isExecute = success?Status.Resolved:Status.ExecutionFail;
            emit ProposalFinished(_id, isExecute, msg.sender);
        }else{
            emit ProposalFinished(_id, Status.Rejected, msg.sender);
        }
        delete proposals[_id];
    }


    function withdraw() public {
        require(lastVoteForUser[msg.sender] <= block.timestamp,"Error: Cannot withdraw while you are on auction!");
        require(voteBalances[msg.sender] != 0, "Error: You have no deposit on this contract!");
        bool success = _transfer(msg.sender,voteBalances[msg.sender]);
        require(success, "Error: Can`t execute withdraw function!");
        voteBalances[msg.sender] = 0;
    }

}

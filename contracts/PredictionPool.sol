// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PredictionPool
 * @dev Staking-based binary options price prediction pool.
 * Users stake ETH/native gas token and predict whether the price of an asset (BTC, ETH, etc.)
 * goes UP or DOWN. 80% of the pool is distributed to winners, 20% goes to the platform fee wallet.
 */
contract PredictionPool {
    address public owner;
    address public feeWallet;
    uint256 public constant FEE_PERCENT = 20; // 20% platform fee
    uint256 public constant WINNER_PERCENT = 80; // 80% distributed to winners

    enum Position { NONE, UP, DOWN }
    enum Outcome { PENDING, UP, DOWN, TIE }

    struct Round {
        uint256 roundId;
        string symbol;
        uint256 duration;
        uint256 startTime;
        uint256 endTime;
        uint256 startPrice;
        uint256 endPrice;
        uint256 totalUpStakes;
        uint256 totalDownStakes;
        Outcome outcome;
        bool isResolved;
        uint256 payoutPerWei; // The scale of payouts (payout per staked Wei)
    }

    uint256 public roundCount;
    mapping(uint256 => Round) public rounds;
    
    // Mapping: roundId => user => Position
    mapping(uint256 => mapping(address => Position)) public userPositions;
    // Mapping: roundId => user => stakedAmount
    mapping(uint256 => mapping(address => uint256)) public userStakes;
    // Mapping: roundId => user => claimed (bool)
    mapping(uint256 => mapping(address => bool)) public userClaims;

    event RoundStarted(
        uint256 indexed roundId,
        string symbol,
        uint256 duration,
        uint256 startTime,
        uint256 endTime,
        uint256 startPrice
    );
    event BetPlaced(
        uint256 indexed roundId,
        address indexed user,
        Position position,
        uint256 amount
    );
    event RoundResolved(
        uint256 indexed roundId,
        uint256 endingPrice,
        Outcome outcome,
        uint256 totalPool,
        uint256 feePaid
    );
    event PayoutClaimed(
        uint256 indexed roundId,
        address indexed user,
        uint256 amount
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    constructor(address _feeWallet) {
        require(_feeWallet != address(0), "Invalid fee wallet");
        owner = msg.sender;
        feeWallet = _feeWallet;
    }

    /**
     * @notice Starts a new prediction round for a specific asset.
     */
    function startRound(
        string calldata _symbol,
        uint256 _duration,
        uint256 _startPrice
    ) external onlyOwner returns (uint256) {
        require(_duration > 0, "Duration must be > 0");
        require(_startPrice > 0, "Start price must be > 0");

        roundCount++;
        uint256 newRoundId = roundCount;
        uint256 endTime = block.timestamp + _duration;

        rounds[newRoundId] = Round({
            roundId: newRoundId,
            symbol: _symbol,
            duration: _duration,
            startTime: block.timestamp,
            endTime: endTime,
            startPrice: _startPrice,
            endPrice: 0,
            totalUpStakes: 0,
            totalDownStakes: 0,
            outcome: Outcome.PENDING,
            isResolved: false,
            payoutPerWei: 0
        });

        emit RoundStarted(
            newRoundId,
            _symbol,
            _duration,
            block.timestamp,
            endTime,
            _startPrice
        );

        return newRoundId;
    }

    /**
     * @notice Users call this to place their bet on UP or DOWN.
     * @param _roundId The ID of the active round.
     * @param _predictUp True to predict UP, false to predict DOWN.
     */
    function predict(uint256 _roundId, bool _predictUp) external payable {
        Round storage round = rounds[_roundId];
        require(round.startTime > 0, "Round does not exist");
        require(block.timestamp < round.endTime, "Predictions are closed");
        require(msg.value > 0, "Must stake some amount");
        require(userPositions[_roundId][msg.sender] == Position.NONE, "Already predicted");

        Position pos = _predictUp ? Position.UP : Position.DOWN;
        userPositions[_roundId][msg.sender] = pos;
        userStakes[_roundId][msg.sender] = msg.value;

        if (_predictUp) {
            round.totalUpStakes += msg.value;
        } else {
            round.totalDownStakes += msg.value;
        }

        emit BetPlaced(_roundId, msg.sender, pos, msg.value);
    }

    /**
     * @notice Resolves the round, decides the outcome, transfers the 20% platform fee,
     * and sets up the payout multipliers for winners.
     * @param _roundId The ID of the round to resolve.
     * @param _endPrice The final price of the asset at the end time.
     */
    function resolveRound(uint256 _roundId, uint256 _endPrice) external onlyOwner {
        Round storage round = rounds[_roundId];
        require(round.startTime > 0, "Round does not exist");
        require(block.timestamp >= round.endTime, "Round is still active");
        require(!round.isResolved, "Round already resolved");
        require(_endPrice > 0, "Ending price must be > 0");

        round.endPrice = _endPrice;
        round.isResolved = true;

        Outcome roundOutcome;
        if (_endPrice > round.startPrice) {
            roundOutcome = Outcome.UP;
        } else if (_endPrice < round.startPrice) {
            roundOutcome = Outcome.DOWN;
        } else {
            roundOutcome = Outcome.TIE;
        }
        round.outcome = roundOutcome;

        uint256 totalPool = round.totalUpStakes + round.totalDownStakes;
        uint256 platformFee = (totalPool * FEE_PERCENT) / 100;
        uint256 winnerPool = totalPool - platformFee;

        if (totalPool > 0) {
            // Transfer 20% platform fee to fee wallet
            (bool success, ) = payable(feeWallet).call{value: platformFee}("");
            require(success, "Platform fee transfer failed");
        }

        if (roundOutcome == Outcome.UP && round.totalUpStakes > 0) {
            // Payout per staked Wei: winnerPool * 1e18 / totalUpStakes
            round.payoutPerWei = (winnerPool * 1e18) / round.totalUpStakes;
        } else if (roundOutcome == Outcome.DOWN && round.totalDownStakes > 0) {
            round.payoutPerWei = (winnerPool * 1e18) / round.totalDownStakes;
        } else if (roundOutcome == Outcome.TIE && totalPool > 0) {
            // In case of a Tie, users claim their stakes back (minus 20% fee or full refund? We refund 100%)
            // We set payoutPerWei to refund their 100% share of remaining pool
            round.payoutPerWei = (winnerPool * 1e18) / totalPool;
        } else {
            // No one guessed correctly. The winnerPool stays in the contract or goes to feeWallet
            if (winnerPool > 0) {
                (bool success, ) = payable(feeWallet).call{value: winnerPool}("");
                require(success, "Treasury transfer failed");
            }
        }

        emit RoundResolved(_roundId, _endPrice, roundOutcome, totalPool, platformFee);
    }

    /**
     * @notice Allows winning user to claim their share of the prediction pool.
     */
    function claimPayout(uint256 _roundId) external {
        Round storage round = rounds[_roundId];
        require(round.isResolved, "Round not resolved yet");
        require(!userClaims[_roundId][msg.sender], "Payout already claimed");

        uint256 userStake = userStakes[_roundId][msg.sender];
        require(userStake > 0, "No stake in this round");

        Position pos = userPositions[_roundId][msg.sender];
        bool isWinner = false;

        if (round.outcome == Outcome.TIE) {
            isWinner = true; // Everyone gets refund
        } else if (round.outcome == Outcome.UP && pos == Position.UP) {
            isWinner = true;
        } else if (round.outcome == Outcome.DOWN && pos == Position.DOWN) {
            isWinner = true;
        }

        require(isWinner, "You are not a winner");

        userClaims[_roundId][msg.sender] = true;
        
        // Payout = userStake * payoutPerWei / 1e18
        uint256 payoutAmount;
        if (round.outcome == Outcome.TIE) {
            payoutAmount = (userStake * round.payoutPerWei) / 1e18; // proportional share of the 80% pool
        } else {
            payoutAmount = (userStake * round.payoutPerWei) / 1e18;
        }

        (bool success, ) = payable(msg.sender).call{value: payoutAmount}("");
        require(success, "Payout transfer failed");

        emit PayoutClaimed(_roundId, msg.sender, payoutAmount);
    }

    /**
     * @notice Change the owner of the contract.
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }

    /**
     * @notice Helper to get round info.
     */
    function getRound(uint256 _roundId) external view returns (
        string memory symbol,
        uint256 startTime,
        uint256 endTime,
        uint256 startPrice,
        uint256 endPrice,
        uint256 totalUpStakes,
        uint256 totalDownStakes,
        Outcome outcome,
        bool isResolved
    ) {
        Round memory r = rounds[_roundId];
        return (
            r.symbol,
            r.startTime,
            r.endTime,
            r.startPrice,
            r.endPrice,
            r.totalUpStakes,
            r.totalDownStakes,
            r.outcome,
            r.isResolved
        );
    }
}

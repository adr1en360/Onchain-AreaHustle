// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TaskEscrow — stablecoin escrow with automated payout on release
contract TaskEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable paymentToken;
    uint16 public platformFeeBps;
    address public feeRecipient;

    enum Status {
        None,
        Funded,
        Assigned,
        Released,
        Cancelled
    }

    struct Escrow {
        bytes32 taskRef;
        address customer;
        address hustler;
        uint256 amount;
        Status status;
    }

    uint256 public nextEscrowId = 1;
    mapping(uint256 => Escrow) public escrows;
    mapping(bytes32 => uint256) public escrowByTaskRef;

    event EscrowCreated(uint256 indexed escrowId, bytes32 indexed taskRef, address indexed customer, uint256 amount);
    event HustlerAssigned(uint256 indexed escrowId, address indexed hustler);
    event EscrowReleased(uint256 indexed escrowId, address indexed hustler, uint256 payout, uint256 fee);
    event EscrowCancelled(uint256 indexed escrowId, address indexed customer, uint256 amount);

    constructor(address paymentToken_, address feeRecipient_, uint16 platformFeeBps_) Ownable(msg.sender) {
        require(paymentToken_ != address(0), "Invalid token");
        paymentToken = IERC20(paymentToken_);
        feeRecipient = feeRecipient_;
        platformFeeBps = platformFeeBps_;
    }

    function createEscrow(bytes32 taskRef, uint256 amount) external nonReentrant returns (uint256 escrowId) {
        require(amount > 0, "Amount required");
        require(escrowByTaskRef[taskRef] == 0, "Escrow exists");

        paymentToken.safeTransferFrom(msg.sender, address(this), amount);

        escrowId = nextEscrowId++;
        escrows[escrowId] = Escrow({
            taskRef: taskRef,
            customer: msg.sender,
            hustler: address(0),
            amount: amount,
            status: Status.Funded
        });
        escrowByTaskRef[taskRef] = escrowId;

        emit EscrowCreated(escrowId, taskRef, msg.sender, amount);
    }

    function assignHustler(uint256 escrowId, address hustler) external {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == Status.Funded, "Not funded");
        require(msg.sender == escrow.customer, "Only customer");
        require(hustler != address(0), "Invalid hustler");

        escrow.hustler = hustler;
        escrow.status = Status.Assigned;
        emit HustlerAssigned(escrowId, hustler);
    }

    function releaseEscrow(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        require(msg.sender == escrow.customer, "Only customer");
        require(escrow.status == Status.Assigned, "Not assigned");
        require(escrow.hustler != address(0), "No hustler");

        escrow.status = Status.Released;

        uint256 fee = (escrow.amount * platformFeeBps) / 10_000;
        uint256 payout = escrow.amount - fee;

        if (fee > 0 && feeRecipient != address(0)) {
            paymentToken.safeTransfer(feeRecipient, fee);
        }
        paymentToken.safeTransfer(escrow.hustler, payout);

        emit EscrowReleased(escrowId, escrow.hustler, payout, fee);
    }

    function cancelEscrow(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        require(msg.sender == escrow.customer, "Only customer");
        require(escrow.status == Status.Funded, "Cannot cancel");

        escrow.status = Status.Cancelled;
        paymentToken.safeTransfer(escrow.customer, escrow.amount);
        emit EscrowCancelled(escrowId, escrow.customer, escrow.amount);
    }

    function setPlatformFee(uint16 platformFeeBps_) external onlyOwner {
        require(platformFeeBps_ <= 1_000, "Fee too high");
        platformFeeBps = platformFeeBps_;
    }

    function setFeeRecipient(address feeRecipient_) external onlyOwner {
        feeRecipient = feeRecipient_;
    }
}

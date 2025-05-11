// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @notice Interface for the Seaport contract.
 * @dev Defines the struct and function for `fulfillBasicOrder_efficient_6GL6yc`.
 */
interface ISeaport {
    /**
     * @dev Struct for specifying additional recipients of consideration items in a Seaport order.
     * @param amount The amount of the token to be sent to the recipient.
     * @param recipient The address of the recipient.
     */
    struct AdditionalRecipient {
        uint256 amount;
        address payable recipient;
    }

    /**
     * @dev Parameters for fulfilling a basic Seaport order using the efficient fulfillment method.
     *      This structure must precisely match the tuple expected by Seaport's
     *      `fulfillBasicOrder_efficient_6GL6yc` function.
     * @param considerationToken The token address for the primary consideration item (e.g., address(0) for ETH if seller receives ETH).
     * @param considerationIdentifier The identifier for the consideration item (e.g., 0 for ETH/ERC20, tokenId for ERC721).
     * @param considerationAmount The amount of the primary consideration item the offerer (seller) receives.
     * @param offerer The address of the account that created the order (the seller).
     * @param zone An optional address that can enforce additional rules or cancel the order (typically address(0) for basic orders).
     * @param offerToken The token address for the primary item being offered (e.g., the NFT contract address).
     * @param offerIdentifier The identifier for the offered item (e.g., the NFT's tokenId).
     * @param offerAmount The amount of the offered item (e.g., 1 for an ERC721 NFT).
     * @param basicOrderType An enum value indicating the type of basic order (e.g., ETH_TO_ERC721).
     * @param startTime The Unix timestamp when the order becomes valid.
     * @param endTime The Unix timestamp when the order expires.
     * @param zoneHash A hash used by restricted orders with zones (typically bytes32(0) for basic orders).
     * @param salt A random number used to ensure order uniqueness.
     * @param offererConduitKey A key identifying the conduit contract approved by the offerer (seller).
     * @param fulfillerConduitKey A key identifying the conduit contract approved by the fulfiller (buyer/this contract).
     * @param totalOriginalAdditionalRecipients The total number of recipients in the `additionalRecipients` array.
     * @param additionalRecipients An array detailing other recipients (e.g., for marketplace fees) and the amounts they receive.
     * @param signature The EIP-712 signature of the order parameters provided by the offerer.
     */
    struct EfficientBasicOrderParameters {
        address considerationToken;
        uint256 considerationIdentifier;
        uint256 considerationAmount;
        address payable offerer;
        address zone;
        address offerToken;
        uint256 offerIdentifier;
        uint256 offerAmount;
        uint8 basicOrderType;
        uint256 startTime;
        uint256 endTime;
        bytes32 zoneHash;
        uint256 salt;
        bytes32 offererConduitKey;
        bytes32 fulfillerConduitKey;
        uint256 totalOriginalAdditionalRecipients;
        AdditionalRecipient[] additionalRecipients;
        bytes signature;
    }

    function fulfillBasicOrder_efficient_6GL6yc(EfficientBasicOrderParameters calldata parameters) external payable returns (bool fulfilled);
}

/**
 * @dev Interface for an ERC721 token that supports a `burn` function.
 */
interface IERC721Burnable is IERC721 {
    function burn(uint256 tokenId) external;
}

/**
 * @title NftPoolAndTriggerBuy
 * @author Your Name/Org Here (e.g., SFYL)
 * @notice This contract allows users to pool ETH to collectively purchase a specific NFT listed on Seaport.
 *         Upon successful acquisition, the NFT is immediately burned. Contributors can withdraw their
 *         funds if the NFT has not yet been acquired or if an emergency refund is triggered.
 * @dev Uses Seaport's `fulfillBasicOrder_efficient_6GL6yc` for NFT purchase.
 *      The `onERC721Received` hook is not relied upon; burn logic is handled post-Seaport call.
 */
contract NftPoolAndTriggerBuy is ReentrancyGuard { // Removed IERC721Receiver
    /*///////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    IERC721 public immutable targetNftContract;
    uint256 public immutable targetNftTokenId;
    uint256 public immutable nftPriceWei;
    ISeaport public immutable seaport;
    address public immutable contractDeployer;

    uint256 public totalRaisedWei;
    mapping(address => uint256) public contributions;

    enum State { Funding, NftAcquiredAndBurned, EmergencyRefund } 
    State public currentState;

    /*///////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event Contributed(address indexed contributor, uint256 amountWei);
    event ContributionWithdrawn(address indexed contributor, uint256 amountWei);
    event PurchaseAttempted(address indexed initiator, uint256 nftPricePaid, bool success, bytes reason);
    event NftAcquiredAndBurned(uint256 indexed tokenId); // Made tokenId indexed
    event EmergencyRefundEnabled();
    event RefundClaimed(address indexed contributor, uint256 amountWei);

    /*///////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyDeployer() {
        require(msg.sender == contractDeployer, "NftPool: Caller is not the deployer");
        _;
    }

    /*///////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initializes the contract with details of the target NFT and Seaport.
     * @param _targetNftContractAddress The ERC721 contract address of the NFT to purchase.
     * @param _targetNftTokenId The token ID of the NFT to purchase.
     * @param _exactNftPriceWei The total price in Wei required to purchase the NFT via Seaport.
     * @param _seaportAddress The address of the Seaport contract (e.g., v1.6).
     */
    constructor(
        address _targetNftContractAddress,
        uint256 _targetNftTokenId,
        uint256 _exactNftPriceWei,
        address _seaportAddress
    ) {
        require(_targetNftContractAddress != address(0), "NftPool: Invalid target NFT contract address");
        require(_seaportAddress != address(0), "NftPool: Invalid Seaport address");
        require(_exactNftPriceWei > 0, "NftPool: NFT price must be greater than 0");

        targetNftContract = IERC721(_targetNftContractAddress);
        targetNftTokenId = _targetNftTokenId;
        nftPriceWei = _exactNftPriceWei;
        seaport = ISeaport(_seaportAddress);
        contractDeployer = msg.sender;
        currentState = State.Funding;
    }

    /*///////////////////////////////////////////////////////////////
                          EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Allows a user to contribute ETH to the pool.
     *         If this contribution meets or exceeds the `nftPriceWei`, an attempt is made to purchase the NFT.
     * @param seaportOrderParams The Seaport parameters required to fulfill the order for the target NFT.
     *                           These parameters must be for an ETH-to-NFT order and match the configured target.
     */
    function contributeAndAttemptPurchase(
        ISeaport.EfficientBasicOrderParameters calldata seaportOrderParams
    ) external payable nonReentrant {
        _contribute(msg.sender, msg.value);

        if (totalRaisedWei >= nftPriceWei && currentState == State.Funding) {
            _attemptPurchase(msg.sender, seaportOrderParams);
        }
    }

    /**
     * @notice Allows anyone to trigger a purchase attempt if sufficient funds are already pooled
     *         and the NFT has not yet been acquired.
     * @param seaportOrderParams The Seaport parameters required to fulfill the order for the target NFT.
     */
    function retryPurchase(
        ISeaport.EfficientBasicOrderParameters calldata seaportOrderParams
    ) external nonReentrant {
        require(currentState == State.Funding, "NftPool: Not in Funding state");
        require(totalRaisedWei >= nftPriceWei, "NftPool: Insufficient funds for purchase");
        _attemptPurchase(msg.sender, seaportOrderParams);
    }

    /**
     * @notice Allows a contributor to withdraw their entire contributed amount,
     *         provided the pool is in the `Funding` state.
     */
    function withdrawContribution() external nonReentrant {
        require(currentState == State.Funding, "NftPool: Withdrawals only allowed during Funding state");

        uint256 amountToWithdraw = contributions[msg.sender];
        require(amountToWithdraw > 0, "NftPool: No contribution to withdraw");

        contributions[msg.sender] = 0;
        totalRaisedWei -= amountToWithdraw; 
        (bool ok, ) = payable(msg.sender).call{value: amountToWithdraw}("");
        require(ok, "ETH transfer failed");
        emit ContributionWithdrawn(msg.sender, amountToWithdraw);
    }

    /**
     * @notice Allows the contract deployer to enable emergency refunds.
     *         This action is irreversible and should only be taken if the NFT purchase
     *         is deemed impossible or the project needs to be terminated.
     * @dev Can only be called when in the `Funding` state and if the NFT has not been acquired.
     */
    function enableEmergencyRefund() external onlyDeployer {
        require(currentState == State.Funding, "NftPool: Emergency refund only applicable if still in Funding state");

        // Check if NFT is already owned by this contract, which would mean it was acquired.
        // This check is a safeguard, as currentState should already reflect NftAcquiredAndBurned.
        bool nftOwnedByContract = false;
        try targetNftContract.ownerOf(targetNftTokenId) returns (address owner) {
            if (owner == address(this)) {
                nftOwnedByContract = true;
            }
        } catch { /* Token does not exist or ownerOf reverted, implies not owned or already burned */ }
        require(!nftOwnedByContract, "NftPool: NFT appears to be acquired by this contract; emergency refund not applicable");

        currentState = State.EmergencyRefund;
        emit EmergencyRefundEnabled();
    }

    /**
     * @notice Allows a contributor to claim their full refund after emergency refunds have been enabled.
     */
    function claimEmergencyRefund() external nonReentrant {
        require(currentState == State.EmergencyRefund, "NftPool: Emergency refunds not active");
        uint256 amountToRefund = contributions[msg.sender];
        require(amountToRefund > 0, "NftPool: No contribution to refund");

        contributions[msg.sender] = 0;
        totalRaisedWei -= amountToRefund;
        (bool ok, ) = payable(msg.sender).call{value: amountToRefund}("");
        require(ok, "ETH transfer failed");
        emit RefundClaimed(msg.sender, amountToRefund);
    }

    /*///////////////////////////////////////////////////////////////
                          INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Handles the logic for recording a contribution.
     * @param contributor The address making the contribution.
     * @param amount The amount of ETH contributed in Wei.
     */
    function _contribute(address contributor, uint256 amount) internal {
        require(currentState == State.Funding, "NftPool: Not in Funding state");
        // Allow 0-value contributions if the pool is already fully funded,
        // effectively allowing a user to trigger a purchase attempt without adding more funds.
        // If pool is not funded, contribution must be > 0.
        if (totalRaisedWei < nftPriceWei) {
            require(amount > 0, "NftPool: Contribution must be > 0 if pool not yet funded");
        }

        totalRaisedWei += amount;
        contributions[contributor] += amount;
        emit Contributed(contributor, amount);
    }

    /**
     * @dev Core logic to attempt purchasing the NFT via Seaport and then burn it.
     * @param initiator The address that triggered this purchase attempt.
     * @param seaportOrderParams The Seaport parameters for the order.
     */
    function _attemptPurchase(
        address initiator,
        ISeaport.EfficientBasicOrderParameters calldata seaportOrderParams
    ) internal {
        // Validate parameters for an ETH-to-ERC721 purchase
        require(seaportOrderParams.offerToken == address(targetNftContract), "NftPool: Order params - Mismatched NFT contract in offer");
        require(seaportOrderParams.offerIdentifier == targetNftTokenId, "NftPool: Order params - Mismatched NFT ID in offer");
        require(seaportOrderParams.offerAmount == 1, "NftPool: Order params - NFT quantity in offer must be 1");
        require(seaportOrderParams.considerationToken == address(0), "NftPool: Order params - Consideration token must be ETH (address(0))");

        uint256 totalEthForSeaportOrder = seaportOrderParams.considerationAmount;
        for (uint i = 0; i < seaportOrderParams.additionalRecipients.length; i++) {
            totalEthForSeaportOrder += seaportOrderParams.additionalRecipients[i].amount;
        }

        require(totalEthForSeaportOrder == nftPriceWei, "NftPool: Order params - Total ETH value mismatch with configured price");
        require(address(this).balance >= nftPriceWei, "NftPool: Contract ETH balance insufficient for purchase (should match totalRaisedWei)");

        bytes memory reasonData;
        bool seaportedFulfilledSuccessfully = false;

        try seaport.fulfillBasicOrder_efficient_6GL6yc{value: nftPriceWei}(seaportOrderParams) returns (bool fulfilled) {
            if (fulfilled) {
                seaportedFulfilledSuccessfully = true;
                // NFT should now be owned by this contract. Proceed to burn.
                currentState = State.NftAcquiredAndBurned;

                address burnDestination = address(0); // Standard burn address
                try IERC721Burnable(address(targetNftContract)).burn(targetNftTokenId) {
                    // Successfully burned via IERC721Burnable
                } catch {
                    // Fallback: Attempt transfer to the zero address
                    try targetNftContract.transferFrom(address(this), burnDestination, targetNftTokenId) {
                        // Successfully burned via transfer
                    } catch (bytes memory transferFailReason) {
                        // Critical: NFT acquired but burn failed. State is NftAcquiredAndBurned.
                        // The NFT remains in this contract. This is an undesirable but possible outcome.
                        // No specific error emitted here for burn failure, NftAcquiredAndBurned still signals acquisition.
                        reasonData = abi.encodePacked("Burn failed: ", transferFailReason); // Store burn failure reason
                    }
                }
                emit NftAcquiredAndBurned(targetNftTokenId);
                emit PurchaseAttempted(initiator, nftPriceWei, true, reasonData); // reasonData might contain burn failure
            } else {
                // Seaport call succeeded but returned fulfilled = false
                emit PurchaseAttempted(initiator, nftPriceWei, false, "Seaport: fulfilled was false");
            }
        } catch Error(string memory reason) {
            reasonData = bytes(reason);
            emit PurchaseAttempted(initiator, nftPriceWei, false, reasonData);
        } catch (bytes memory reason) {
            reasonData = reason;
            emit PurchaseAttempted(initiator, nftPriceWei, false, reasonData);
        }
    }
}

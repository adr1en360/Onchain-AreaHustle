"""Celo chain helpers — RPC calls, signature verification, task refs."""

import hashlib
import json
from pathlib import Path
from typing import Any, Optional

import httpx
from eth_account import Account
from eth_account.messages import encode_defunct

# Celo Sepolia USDT (hackathon requirement)
DEFAULT_CHAIN_ID = 11142220
DEFAULT_RPC_URL = "https://forno.celo-sepolia.celo-testnet.org"
DEFAULT_PAYMENT_TOKEN = "0xd077A400968890Eacc75cdc901F0356c943e4fDb"
DEFAULT_PAYMENT_DECIMALS = 6
DEFAULT_PAYMENT_SYMBOL = "USDT"

REGISTRY_ABI = [
    {
        "type": "event",
        "name": "UserRegistered",
        "inputs": [
            {"name": "user", "type": "address", "indexed": True},
            {"name": "role", "type": "uint8", "indexed": False},
            {"name": "displayName", "type": "string", "indexed": False},
        ],
    }
]

ESCROW_ABI = [
    {
        "type": "event",
        "name": "EscrowCreated",
        "inputs": [
            {"name": "escrowId", "type": "uint256", "indexed": True},
            {"name": "taskRef", "type": "bytes32", "indexed": True},
            {"name": "customer", "type": "address", "indexed": True},
            {"name": "amount", "type": "uint256", "indexed": False},
        ],
    },
    {
        "type": "event",
        "name": "HustlerAssigned",
        "inputs": [
            {"name": "escrowId", "type": "uint256", "indexed": True},
            {"name": "hustler", "type": "address", "indexed": True},
        ],
    },
    {
        "type": "event",
        "name": "EscrowReleased",
        "inputs": [
            {"name": "escrowId", "type": "uint256", "indexed": True},
            {"name": "hustler", "type": "address", "indexed": True},
            {"name": "payout", "type": "uint256", "indexed": False},
            {"name": "fee", "type": "uint256", "indexed": False},
        ],
    },
]


def load_deployment(chain_id: int) -> dict[str, Any]:
    repo_root = Path(__file__).resolve().parents[2]
    deployment_file = repo_root / "deployments" / f"chain-{chain_id}.json"
    if deployment_file.exists():
        return json.loads(deployment_file.read_text())
    return {}


def normalize_address(address: str) -> str:
    if not address or not address.startswith("0x") or len(address) != 42:
        raise ValueError("Invalid wallet address")
    return address.lower()


def task_ref_from_id(task_id: str) -> str:
    """Deterministic bytes32 task reference for escrow contract."""
    digest = hashlib.sha256(f"areahustle:task:{task_id}".encode()).hexdigest()
    return f"0x{digest}"


def amount_to_token_wei(amount: float, decimals: int = DEFAULT_PAYMENT_DECIMALS) -> int:
    return int(round(amount * 10**decimals))


def token_wei_to_amount(amount_wei: int, decimals: int = DEFAULT_PAYMENT_DECIMALS) -> float:
    return amount_wei / 10**decimals


# Legacy alias
naira_to_token_wei = amount_to_token_wei
token_wei_to_naira = token_wei_to_amount


def build_wallet_message(action: str, address: str, nonce: str) -> str:
    return (
        f"AreaHustle wants you to sign in with your Celo wallet.\n\n"
        f"Action: {action}\n"
        f"Address: {address}\n"
        f"Nonce: {nonce}"
    )


def verify_wallet_signature(address: str, message: str, signature: str) -> bool:
    try:
        recovered = Account.recover_message(
            encode_defunct(text=message),
            signature=signature,
        )
        return recovered.lower() == normalize_address(address)
    except Exception:
        return False


async def rpc_call(rpc_url: str, method: str, params: list[Any]) -> Any:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            rpc_url,
            json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
        )
        response.raise_for_status()
        payload = response.json()
        if "error" in payload:
            raise RuntimeError(payload["error"])
        return payload.get("result")


async def get_transaction_receipt(rpc_url: str, tx_hash: str) -> Optional[dict]:
    return await rpc_call(rpc_url, "eth_getTransactionReceipt", [tx_hash])


def _decode_topic_address(topic: str) -> str:
    return "0x" + topic[-40:].lower()


def find_event_in_receipt(receipt: dict, contract_address: str, event_name: str, abi: list) -> Optional[dict]:
    if not receipt or receipt.get("status") != "0x1":
        return None

    event_abi = next(item for item in abi if item.get("type") == "event" and item["name"] == event_name)
    from eth_utils import keccak

    signature = f"{event_name}({','.join(i['type'] for i in event_abi['inputs'])})"
    topic0 = "0x" + keccak(text=signature).hex()

    target = contract_address.lower()
    for log in receipt.get("logs", []):
        if log.get("address", "").lower() != target:
            continue
        topics = log.get("topics", [])
        if not topics or topics[0].lower() != topic0.lower():
            continue

        decoded: dict[str, Any] = {"name": event_name}
        indexed_inputs = [i for i in event_abi["inputs"] if i.get("indexed")]
        for idx, inp in enumerate(indexed_inputs):
            topic_value = topics[idx + 1]
            if inp["type"] == "address":
                decoded[inp["name"]] = _decode_topic_address(topic_value)
            elif inp["type"] == "bytes32":
                decoded[inp["name"]] = topic_value.lower()
            elif inp["type"] == "uint256":
                decoded[inp["name"]] = int(topic_value, 16)

        non_indexed = [i for i in event_abi["inputs"] if not i.get("indexed")]
        if non_indexed and log.get("data") and log["data"] != "0x":
            # Only EscrowCreated has non-indexed amount — decode manually
            data = log["data"][2:]
            if len(data) >= 64:
                decoded[non_indexed[0]["name"]] = int(data[:64], 16)

        return decoded
    return None


async def verify_escrow_created(
    rpc_url: str,
    tx_hash: str,
    escrow_address: str,
    expected_task_ref: str,
    expected_customer: str,
) -> Optional[dict]:
    receipt = await get_transaction_receipt(rpc_url, tx_hash)
    event = find_event_in_receipt(receipt, escrow_address, "EscrowCreated", ESCROW_ABI)
    if not event:
        return None
    if event.get("taskRef", "").lower() != expected_task_ref.lower():
        return None
    if event.get("customer", "").lower() != normalize_address(expected_customer):
        return None
    return event


async def verify_escrow_released(
    rpc_url: str,
    tx_hash: str,
    escrow_address: str,
    expected_escrow_id: int,
) -> Optional[dict]:
    receipt = await get_transaction_receipt(rpc_url, tx_hash)
    event = find_event_in_receipt(receipt, escrow_address, "EscrowReleased", ESCROW_ABI)
    if not event:
        return None
    if int(event.get("escrowId", -1)) != expected_escrow_id:
        return None
    return event


async def verify_registry_registration(
    rpc_url: str,
    tx_hash: str,
    registry_address: str,
    expected_address: str,
) -> Optional[dict]:
    receipt = await get_transaction_receipt(rpc_url, tx_hash)
    event = find_event_in_receipt(receipt, registry_address, "UserRegistered", REGISTRY_ABI)
    if not event:
        return None
    if event.get("user", "").lower() != normalize_address(expected_address):
        return None
    return event

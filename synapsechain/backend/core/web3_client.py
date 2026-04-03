from web3 import Web3
from core.config import settings
import json, os

_w3: Web3 | None = None

def get_w3() -> Web3:
    global _w3
    if _w3 is None:
        _w3 = Web3(Web3.HTTPProvider(settings.ganache_url))
        assert _w3.is_connected(), f"Cannot connect to Ganache at {settings.ganache_url}"
    return _w3

def load_addresses() -> dict:
    with open(settings.addresses_path) as f:
        return json.load(f)

def load_contract(name: str, address: str):
    abi_path = os.path.join(
        settings.artifacts_path,
        f"contracts/{name}.sol/{name}.json"
    )
    with open(abi_path) as f:
        artifact = json.load(f)
    return get_w3().eth.contract(
        address=Web3.to_checksum_address(address),
        abi=artifact["abi"]
    )

def get_contract(name: str):
    addresses = load_addresses()
    return load_contract(name, addresses[name])

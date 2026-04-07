import requests
import hashlib
from core.config import settings


def upload_to_ipfs(file_bytes: bytes, filename: str) -> dict:
    """Upload file to local IPFS node. Returns CID and content hash."""
    try:
        response = requests.post(
            f"{settings.ipfs_api_url}/api/v0/add",
            files={"file": (filename, file_bytes)},
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        cid = data["Hash"]
        content_hash = "0x" + hashlib.sha256(file_bytes).hexdigest()
        return {
            "cid":          cid,
            "content_hash": content_hash,
            "ipfs_url":     f"{settings.ipfs_gateway_url}/ipfs/{cid}",
            "token_uri":    f"ipfs://{cid}",
            "error":        ""
        }
    except Exception as e:
        return {
            "cid":          "",
            "content_hash": "",
            "ipfs_url":     "",
            "token_uri":    "",
            "error":        str(e)
        }

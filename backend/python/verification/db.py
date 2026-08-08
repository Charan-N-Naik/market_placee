"""
verification/db.py
==================
Async MongoDB connection helper using Motor (async PyMongo driver).
Provides a single shared client and collection accessors used across
all verification sub-services.
"""

import os
import logging
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

logger = logging.getLogger(__name__)

_client = None


def get_client():
    """Return (or lazily create) the shared Motor client."""
    global _client
    if _client is None:
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
        except ImportError:
            raise RuntimeError(
                "motor library is required for MongoDB access. "
                "Install it with: pip install motor pymongo"
            )
        mongo_uri = os.getenv("MONGODB_URI")
        if not mongo_uri:
            # Fallback to Node backend .env
            node_env = os.path.join(os.path.dirname(__file__), '..', '..', 'node', '.env')
            if os.path.exists(node_env):
                from dotenv import dotenv_values
                node_cfg = dotenv_values(node_env)
                mongo_uri = node_cfg.get("MONGODB_URI")
        if not mongo_uri:
            raise RuntimeError(
                "MONGODB_URI not found in environment. "
                "Set it in backend/python/.env or backend/node/.env"
            )
        _client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=8000)
        logger.info("[VerificationDB] Motor client initialized.")
    return _client


def get_db():
    """Return the kisanbazaar database handle."""
    return get_client()["kisanbazaar"]


def get_listings_col():
    return get_db()["listings"]


def get_image_hashes_col():
    """Collection that stores perceptual hashes of all uploaded images for duplicate detection."""
    return get_db()["listing_image_hashes"]


def get_users_col():
    return get_db()["users"]


async def close_connection():
    global _client
    if _client:
        _client.close()
        _client = None
        logger.info("[VerificationDB] Motor client closed.")

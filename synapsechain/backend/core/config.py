from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ganache_url: str = "http://ganache:8545"
    deployer_private_key: str = ""
    openai_api_key: str = ""
    artifacts_path: str = "/artifacts"
    addresses_path: str = "/addresses.json"

    class Config:
        env_file = ".env"

settings = Settings()

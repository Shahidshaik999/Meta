import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    META_API_KEY: str = os.getenv("META_API_KEY", "")
    META_API_BASE_URL: str = os.getenv("META_API_BASE_URL", "https://api.meta.ai/v1")
    VISION_MODEL: str = os.getenv("VISION_MODEL", "muse-spark-1.3")
    WONDER_MODEL: str = os.getenv("WONDER_MODEL", "muse-wonder-1.0")
    IMAGE_MODEL: str = os.getenv("IMAGE_MODEL", "muse-image-1.0")
    SAM_MODEL: str = os.getenv("SAM_MODEL", "sam-3.1")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

config = Config()

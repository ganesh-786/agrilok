"""agrilok-api: serve the API with uvicorn.

agrilok-api                      127.0.0.1:8000, for development
HOST=0.0.0.0 PORT=8080 agrilok-api   in a container
"""

from __future__ import annotations

import os
import sys

import uvicorn


def main() -> None:
    # psycopg's async driver cannot use Windows' default Proactor event loop.
    loop = "asyncio:SelectorEventLoop" if sys.platform == "win32" else "auto"
    uvicorn.run(
        "agrilok_api.main:create_app",
        factory=True,
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "8000")),
        loop=loop,
        proxy_headers=True,
        forwarded_allow_ips=os.environ.get("FORWARDED_ALLOW_IPS", "127.0.0.1"),
        server_header=False,
        access_log=False,  # our own request log carries no IPs or query strings
    )


if __name__ == "__main__":
    main()

# simple-proxy-login

Simple login-protected reverse proxy with websocket support. Put it in front of any web UI that needs authentication.

## Quick Start

```bash
docker pull ghcr.io/that0n3guy/simple-proxy-login:latest

docker run -d \
  -p 3000:3000 \
  -e PROXY_TARGET=http://your-app:8080 \
  -e APP_NAME="My App" \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=yourpassword \
  -e SESSION_SECRET=$(openssl rand -hex 32) \
  ghcr.io/that0n3guy/simple-proxy-login:latest
```

## Image

```
ghcr.io/that0n3guy/simple-proxy-login:latest
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROXY_TARGET` | Yes | `http://localhost:8080` | URL to proxy to |
| `APP_NAME` | No | `Admin` | Name shown on login page (e.g., "Inngest", "Grafana") |
| `ADMIN_USERNAME` | Yes | `admin` | Login username |
| `ADMIN_PASSWORD` | Yes | `admin` | Login password |
| `SESSION_SECRET` | Yes | - | Session encryption key |
| `PORT` | No | `3000` | Proxy listen port |

## Usage Examples

### Inngest
```bash
PROXY_TARGET=http://inngest:8288 APP_NAME=Inngest
```

### Grafana
```bash
PROXY_TARGET=http://grafana:3000 APP_NAME=Grafana
```

### Any internal tool
```bash
PROXY_TARGET=http://internal-app:8080 APP_NAME="Internal Tool"
```

## Build & Push Image

### GitHub Container Registry

```bash
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Build & push
cd docker/simple-proxy-login
docker build -t ghcr.io/YOUR_USERNAME/simple-proxy-login:latest .
docker push ghcr.io/YOUR_USERNAME/simple-proxy-login:latest
```

### Docker Hub

```bash
docker login
cd docker/simple-proxy-login
docker build -t YOUR_USERNAME/simple-proxy-login:latest .
docker push YOUR_USERNAME/simple-proxy-login:latest
```

## Test Locally

```bash
cd docker/simple-proxy-login
npm install

# Test with any local server
PROXY_TARGET=http://localhost:8288 \
APP_NAME=Inngest \
ADMIN_USERNAME=admin \
ADMIN_PASSWORD=test \
node server.js
```

Open http://localhost:3000

## Generate Session Secret

```bash
openssl rand -hex 32
```

## Logout

Visit `/logout` to end your session.

## Example Docker compose file using this container:

```
# Self-hosted Inngest Server for Dokploy deployment
#
# Environment variables to set in Dokploy:
#   INNGEST_EVENT_KEY      - Must be hex string with even number of chars
#   INNGEST_SIGNING_KEY    - Must be hex string with even number of chars
#   INNGEST_POSTGRES_URI   - e.g., postgres://user:pass@host:5432/inngest
#   ADMIN_USERNAME         - Login username for Inngest UI
#   ADMIN_PASSWORD         - Login password for Inngest UI
#   SESSION_SECRET         - Session encryption key (openssl rand -hex 32)

services:
  # Auth proxy for Inngest UI
  auth-proxy:
    image: ghcr.io/that0n3guy/simple-proxy-login:latest
    ports:
      - "8288:3000"
    environment:
      PROXY_TARGET: http://inngest:8288
      APP_NAME: Inngest
      ADMIN_USERNAME: ${ADMIN_USERNAME}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      SESSION_SECRET: ${SESSION_SECRET}
      BYPASS_PATHS=/v1/e,/v0/e,/api/v1
    depends_on:
      - inngest
    networks:
      - inngest-network
    restart: unless-stopped

  inngest:
    image: inngest/inngest:v1.14.0
    command: "inngest start"
    expose:
      - "8288"  # Internal only - auth-proxy handles external access
    ports:
      - "8289:8289"  # Connect endpoint (no auth needed - uses signing key)
    environment:
      INNGEST_EVENT_KEY: ${INNGEST_EVENT_KEY}
      INNGEST_SIGNING_KEY: ${INNGEST_SIGNING_KEY}
      INNGEST_POSTGRES_URI: ${INNGEST_POSTGRES_URI}
      INNGEST_REDIS_URI: redis://redis:6379
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - inngest-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8288/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - inngest-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped

volumes:
  redis_data:

networks:
  inngest-network:
    driver: bridge
```
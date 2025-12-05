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

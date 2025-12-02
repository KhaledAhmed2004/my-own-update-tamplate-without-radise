# k6 Load Test Scripts

Auto-generated k6 scripts for load testing.

## About k6

[k6](https://k6.io/) is a modern, developer-friendly load testing tool by Grafana Labs. Written in Go, it uses JavaScript for test scripts.

**Key Features:**
- Developer-friendly JavaScript API
- Performance testing as code
- Beautiful terminal output
- Grafana Cloud integration
- CI/CD friendly

## Installation

```bash
# macOS (Homebrew)
brew install k6

# Windows (Chocolatey)
choco install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Usage

```bash
# Run test
k6 run user-journey.js

# Run with custom base URL
k6 run --env BASE_URL=http://staging.example.com user-journey.js

# Run with custom virtual users
k6 run --vus 50 --duration 5m user-journey.js

# Generate JSON output
k6 run --out json=results.json user-journey.js

# Send results to Grafana Cloud
k6 run --out cloud user-journey.js
```

## Available Scripts

- **user-journey.js** - Complete user workflow (register → login → tasks)
- **auth-only.js** - Authentication focused test
- **payment-flow.js** - Payment processing workflow

## Configuration

Each script has configurable stages:

```javascript
export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp-up
    { duration: '3m', target: 30 },  // Steady state
    { duration: '1m', target: 0 }    // Ramp-down
  ],

  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.05']
  }
};
```

## Thresholds

Performance thresholds are defined in each script:

- **P95 Response Time**: < 500ms
- **P99 Response Time**: < 1000ms
- **Failure Rate**: < 5%
- **Check Success Rate**: > 95%

## Output Formats

```bash
# JSON output
k6 run --out json=results.json user-journey.js

# CSV output
k6 run --out csv=results.csv user-journey.js

# InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 user-journey.js

# Grafana Cloud
k6 run --out cloud user-journey.js
```

## Environment Variables

```bash
# Base URL
export BASE_URL=http://localhost:5000
k6 run user-journey.js

# Or inline
k6 run --env BASE_URL=http://staging.example.com user-journey.js
```

## Tips

1. **Start Small**: Begin with low VU count
2. **Monitor Server**: Watch metrics during test
3. **Use Thresholds**: Set performance criteria
4. **Export Results**: Save for comparison
5. **Iterate**: Adjust and re-run

## Learn More

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Grafana Cloud k6](https://grafana.com/products/cloud/k6/)

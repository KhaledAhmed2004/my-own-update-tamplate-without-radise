# Artillery Load Test Configs

Auto-generated Artillery configurations for load testing.

## Usage

```bash
# Install Artillery globally
npm install -g artillery

# Run a test
artillery run user-journey.yml

# Run with custom target
artillery run --target http://staging.example.com user-journey.yml

# Generate HTML report
artillery run --output report.json user-journey.yml
artillery report report.json

# Quick test (fewer users)
artillery quick --count 10 --num 100 http://localhost:5000/api/v1/tasks
```

## Available Configs

- **user-journey.yml** - Complete user workflow (register → login → tasks)
- **auth-only.yml** - Authentication focused test
- **payment-flow.yml** - Payment processing workflow

## Configuration Structure

```yaml
config:
  target: http://localhost:5000
  phases:
    - duration: 60
      arrivalRate: 5
      name: Warmup
    - duration: 300
      arrivalRate: 20
      name: Sustained Load

scenarios:
  - name: Test Scenario
    flow:
      - post:
          url: /api/v1/auth/login
          json:
            email: "{{ uniqueEmail }}"
            password: "test123"
          capture:
            - json: "$.data.accessToken"
              as: accessToken
```

## Tips

1. **Monitor Performance**: Use `artillery report` to generate visual reports
2. **Adjust Load**: Modify `arrivalRate` in phases for different load levels
3. **Custom Variables**: Edit processor.js for dynamic data generation
4. **Environment URLs**: Use `--target` flag to test different environments

## Learn More

- [Artillery Documentation](https://www.artillery.io/docs)
- [Artillery Examples](https://github.com/artilleryio/artillery/tree/main/examples)

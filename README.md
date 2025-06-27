# serverless-uv-requirements

[![npm version](https://badge.fury.io/js/serverless-uv-requirements.svg)](https://badge.fury.io/js/serverless-uv-requirements)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Fast Python dependency resolution using [uv](https://docs.astral.sh/uv/) for Serverless Framework.

Generates `requirements.txt` from `pyproject.toml` using uv's fast resolver, then works with `serverless-python-requirements` for Lambda packaging.

## Installation

```bash
npm install --save-dev serverless-uv-requirements serverless-python-requirements
```

## Setup

```yaml
# serverless.yml
plugins:
  - serverless-uv-requirements
  - serverless-python-requirements

custom:
  uv:
    mode: compile
    source: pyproject.toml
    output: requirements.txt

  pythonRequirements:
    dockerizePip: non-linux
```

```toml
# pyproject.toml
[project]
dependencies = [
    "fastapi>=0.104.0",
    "pydantic>=2.0.0",
]
```

## Configuration

```yaml
custom:
  uv:
    mode: compile # 'compile' or 'freeze'
    source: pyproject.toml # Input file
    output: requirements.txt # Output file
    verbose: false # Enable verbose logging
    skipIfMissing: false # Skip if uv not available
```

## Requirements

- **uv**: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **Serverless Framework**: >=3.0.0

## How it works

1. uv resolves dependencies from `pyproject.toml` to `requirements.txt` (10-100x faster than pip)
2. serverless-python-requirements handles Lambda packaging

## License

MIT

# monitor-iot-fake

A pure-Python drop-in replacement for the real ESP32 sensor node.
It connects to the same MQTT broker and publishes **identical topics and payloads**, so the backend and frontend work exactly as if the hardware were present.

## Topics published

| Topic | Payload | Cadence |
|---|---|---|
| `home/status/esp32_1` | `{"temp": 22.3, "hum": 44.7}` | every N seconds (default 5 s) |
| `home/alerts/door1` | `OPEN` / `CLOSED` | on simulated state change |
| `home/alerts/door2` | `OPEN` / `CLOSED` | on simulated state change |
| `home/alerts/motion1` | `MOTION` / `CLEAR` | on simulated state change |

## Requirements

- Python 3.11+
- `paho-mqtt >= 2.1`

## Running (plain Python)

```bash
cd monitor-iot-fake

# create a virtual environment (first time only)
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# run with defaults (broker = localhost:1883)
python main.py

# custom broker / options
python main.py --broker 192.168.1.176 --port 1883 --interval 10 --temp-base 24.0
```

## Running on NixOS (via flake.nix)

The root `flake.nix` provides a dedicated shell with Python and paho-mqtt:

```bash
# from the repo root
nix develop .#iot-fake

# then simply
python monitor-iot-fake/main.py
```

## Configuration

All options can be set via environment variables or CLI flags:

| CLI flag | Env variable | Default | Description |
|---|---|---|---|
| `--broker` | `MQTT_BROKER` | `localhost` | MQTT broker hostname / IP |
| `--port` | `MQTT_PORT` | `1883` | MQTT broker port |
| `--client-id` | `MQTT_CLIENT_ID` | `esp32_1_fake` | MQTT client ID (also used in the status topic path) |
| `--interval` | `TEMP_HUM_INTERVAL` | `5` | Temp/humidity publish interval (seconds) |
| `--temp-base` | – | `22.0` | Base temperature in °C |
| `--hum-base` | – | `45.0` | Base relative humidity (%) |

## .env example

```env
MQTT_BROKER=localhost
MQTT_PORT=1883
MQTT_CLIENT_ID=esp32_1_fake
TEMP_HUM_INTERVAL=5
```

#!/usr/bin/env python3
"""
monitor-iot-fake
================
Software simulator of the ESP32 sensor node.

Publishes the exact same MQTT topics and payloads as the real firmware:
  home/status/esp32_1   - JSON  {"temp": <float>, "hum": <float>}
  home/alerts/door1     - "OPEN" | "CLOSED"
  home/alerts/door2     - "OPEN" | "CLOSED"
  home/alerts/motion1   - "MOTION" | "CLEAR"

Configuration via environment variables (see .env.example) or command-line
arguments (run with --help).
"""

import argparse
import json
import logging
import math
import os
import random
import signal
import sys
import time

import paho.mqtt.client as mqtt

# ── defaults ─────────────────────────────────────────────────────────────────

DEFAULT_BROKER    = os.environ.get("MQTT_BROKER",    "localhost")
DEFAULT_PORT      = int(os.environ.get("MQTT_PORT",  "1883"))
DEFAULT_CLIENT_ID = os.environ.get("MQTT_CLIENT_ID", "esp32_1_fake")
DEFAULT_INTERVAL  = float(os.environ.get("TEMP_HUM_INTERVAL", "5"))   # seconds

# ── MQTT topics (identical to the real firmware) ──────────────────────────────

TOPIC_STATUS = "home/status/{client_id}"
TOPIC_DOOR1  = "home/alerts/door1"
TOPIC_DOOR2  = "home/alerts/door2"
TOPIC_MOTION = "home/alerts/motion1"

# ── logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("iot-fake")

# ── sensor simulation helpers ─────────────────────────────────────────────────

class SensorState:
    """Holds the simulated state of every sensor on the board."""

    def __init__(self, temp_base: float = 22.0, hum_base: float = 45.0):
        self._temp_base = temp_base
        self._hum_base  = hum_base
        self._t         = 0.0          # internal time counter for sine wave

        # contact sensors: True = closed, False = open
        self.door1  = True
        self.door2  = True
        # PIR: True = motion detected, False = clear
        self.motion = False

    # ── temperature / humidity ────────────────────────────────────────────────

    def read_temp(self) -> float:
        """Simulate a slowly drifting temperature (±2 °C sine + noise)."""
        self._t += 0.1
        value = self._temp_base + 2.0 * math.sin(self._t) + random.uniform(-0.3, 0.3)
        return round(value, 1)

    def read_hum(self) -> float:
        """Simulate humidity that wanders between base±10 % with noise."""
        value = self._hum_base + 10.0 * math.sin(self._t * 0.7) + random.uniform(-1.0, 1.0)
        return round(max(0.0, min(100.0, value)), 1)

    # ── binary sensors (random events) ───────────────────────────────────────

    def tick_door1(self) -> tuple[bool, str | None]:
        """Randomly toggle door1. Returns (new_state, payload_if_changed)."""
        return self._tick_contact("door1", flip_prob=0.04)

    def tick_door2(self) -> tuple[bool, str | None]:
        return self._tick_contact("door2", flip_prob=0.03)

    def tick_motion(self) -> tuple[bool, str | None]:
        """
        PIR: if currently clear, small chance of detecting motion;
             if motion, higher chance of clearing (motion events are short).
        """
        if not self.motion:
            flip = random.random() < 0.05
        else:
            flip = random.random() < 0.40   # motion clears quickly
        if flip:
            self.motion = not self.motion
            payload = "MOTION" if self.motion else "CLEAR"
            return self.motion, payload
        return self.motion, None

    # ── private ───────────────────────────────────────────────────────────────

    def _tick_contact(self, attr: str, flip_prob: float):
        current = getattr(self, attr)
        if random.random() < flip_prob:
            new = not current
            setattr(self, attr, new)
            payload = "CLOSED" if new else "OPEN"
            return new, payload
        return current, None


# ── MQTT client wrapper ────────────────────────────────────────────────────────

def build_client(args) -> mqtt.Client:
    client = mqtt.Client(
        client_id=args.client_id,
        protocol=mqtt.MQTTv311,
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
    )

    def on_connect(c, userdata, flags, reason_code, properties):
        if reason_code == 0:
            log.info("Connected to MQTT broker %s:%s", args.broker, args.port)
        else:
            log.error("Connection refused, reason code %s", reason_code)

    def on_disconnect(c, userdata, flags, reason_code, properties):
        log.warning("Disconnected (rc=%s) - will reconnect automatically", reason_code)

    def on_publish(c, userdata, mid, reason_code, properties):
        pass  # silently confirmed

    client.on_connect    = on_connect
    client.on_disconnect = on_disconnect
    client.on_publish    = on_publish

    client.reconnect_delay_set(min_delay=1, max_delay=30)
    return client


# ── main loop ─────────────────────────────────────────────────────────────────

def run(args):
    topic_status = TOPIC_STATUS.format(client_id=args.client_id)
    sensors = SensorState(temp_base=args.temp_base, hum_base=args.hum_base)

    client = build_client(args)
    client.connect_async(args.broker, args.port, keepalive=60)
    client.loop_start()

    # graceful shutdown on Ctrl-C or SIGTERM
    stop = False
    def _stop(sig, frame):
        nonlocal stop
        log.info("Shutting down…")
        stop = True
    signal.signal(signal.SIGINT,  _stop)
    signal.signal(signal.SIGTERM, _stop)

    last_temp_hum = 0.0

    log.info(
        "Fake ESP32 started  (client_id=%s, broker=%s:%s, interval=%.1fs)",
        args.client_id, args.broker, args.port, args.interval,
    )

    while not stop:
        now = time.monotonic()

        # ── temperature / humidity (periodic, like the real firmware) ─────────
        if now - last_temp_hum >= args.interval:
            last_temp_hum = now
            t = sensors.read_temp()
            h = sensors.read_hum()
            payload = json.dumps({"temp": t, "hum": h})
            client.publish(topic_status, payload, qos=0)
            log.info("STATUS  %-35s  %s", topic_status, payload)

        # ── contact sensors & PIR (checked every loop tick) ──────────────────
        for topic, changed_payload in [
            (TOPIC_DOOR1,  sensors.tick_door1()[1]),
            (TOPIC_DOOR2,  sensors.tick_door2()[1]),
            (TOPIC_MOTION, sensors.tick_motion()[1]),
        ]:
            if changed_payload is not None:
                client.publish(topic, changed_payload, qos=0)
                log.info("ALERT   %-35s  %s", topic, changed_payload)

        time.sleep(0.5)   # 500 ms tick - same granularity as real firmware's delay(10) * batching

    client.loop_stop()
    client.disconnect()
    log.info("Goodbye.")


# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(
        description="Fake ESP32 MQTT sensor simulator for OfficeMonitor",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--broker",    default=DEFAULT_BROKER,    help="MQTT broker host")
    p.add_argument("--port",      default=DEFAULT_PORT,      type=int, help="MQTT broker port")
    p.add_argument("--client-id", default=DEFAULT_CLIENT_ID, dest="client_id",
                   help="MQTT client ID (also used in the status topic)")
    p.add_argument("--interval",  default=DEFAULT_INTERVAL,  type=float,
                   help="Temperature/humidity publish interval in seconds")
    p.add_argument("--temp-base", default=22.0, type=float, dest="temp_base",
                   help="Base temperature in °C around which simulation wanders")
    p.add_argument("--hum-base",  default=45.0, type=float, dest="hum_base",
                   help="Base relative humidity (%%) around which simulation wanders")
    return p.parse_args()


if __name__ == "__main__":
    run(parse_args())

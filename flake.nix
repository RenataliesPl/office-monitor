{
  description = "OfficeMonitor – dev shell for all components";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        # ── dev shells ────────────────────────────────────────────────────────

        # Full shell: everything you need to work on all components at once.
        devShells.default = pkgs.mkShell {
          name = "office-monitor";

          packages = with pkgs; [
            # Java / Maven  (backend)
            jdk21
            maven

            # Node / npm  (frontend)
            nodejs_22

            # Python  (fake IoT simulator)
            (python3.withPackages (ps: with ps; [ paho-mqtt ]))

            # Docker + Compose  (Postgres, Mosquitto)
            docker
            docker-compose

            # Useful extras
            curl
            jq
          ];

          shellHook = ''
            echo ""
            echo "╔══════════════════════════════════════════════════╗"
            echo "║          OfficeMonitor – dev environment         ║"
            echo "╠══════════════════════════════════════════════════╣"
            echo "║  Java    : $(java -version 2>&1 | head -1)       "
            echo "║  Maven   : $(mvn -v 2>/dev/null | head -1)       "
            echo "║  Node    : $(node --version)                     "
            echo "║  npm     : $(npm --version)                      "
            echo "╠══════════════════════════════════════════════════╣"
            echo "║  Quick-start:                                    ║"
            echo "║  1. cd mosquitto  && docker compose up -d        ║"
            echo "║  2. cd monitor-back && docker compose up -d      ║"
            echo "║  3. cd monitor-back && ./mvnw spring-boot:run    ║"
            echo "║  4. cd monitor-web  && npm install && npm run dev║"
            echo "║  5. python monitor-iot-fake/main.py  (no ESP32!) ║"
            echo "╚══════════════════════════════════════════════════╝"
            echo ""
          '';
        };

        # Focused shell for backend work only.
        devShells.backend = pkgs.mkShell {
          name = "office-monitor-backend";
          packages = with pkgs; [ jdk21 maven docker docker-compose curl jq ];
        };

        # Focused shell for frontend work only.
        devShells.frontend = pkgs.mkShell {
          name = "office-monitor-frontend";
          packages = with pkgs; [ nodejs_22 ];
        };

        # Shell for the fake IoT simulator (monitor-iot-fake).
        devShells.iot-fake = pkgs.mkShell {
          name = "office-monitor-iot-fake";

          packages = with pkgs; [
            (python3.withPackages (ps: with ps; [ paho-mqtt ]))
          ];

          shellHook = ''
            echo ""
            echo "╔══════════════════════════════════════════════════╗"
            echo "║       OfficeMonitor – fake IoT simulator         ║"
            echo "╠══════════════════════════════════════════════════╣"
            echo "║  Python : $(python --version)                    "
            echo "╠══════════════════════════════════════════════════╣"
            echo "║  Run:                                            ║"
            echo "║  python monitor-iot-fake/main.py                 ║"
            echo "║  python monitor-iot-fake/main.py --help          ║"
            echo "╚══════════════════════════════════════════════════╝"
            echo ""
          '';
        };
      }
    );
}

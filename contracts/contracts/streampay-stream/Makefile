default: build

all: test build grantfox-build bench-compile

build:
	stellar contract build
	@ls -l target/wasm32v1-none/release/*.wasm

fmt:
	cargo fmt --all

clean:
	cargo clean

# ── Coverage gate (GrantFox ≥ 95 %) ─────────────────────────────────────────
#
# Prerequisites: cargo-llvm-cov must be installed.
#   cargo install cargo-llvm-cov
#
# Usage:
#   make coverage          – run gate, fail if any metric < 95 %
#   make coverage-report   – same but also write lcov.info + open HTML report
#
# The --fail-under-* flags mirror the CI gate in .github/workflows/coverage.yml
# so that the gate behaves identically locally and in CI.
coverage:
	cargo llvm-cov \
		--all-features \
		--workspace \
		--fail-under-lines 95 \
		--fail-under-regions 95 \
		--fail-under-functions 95

coverage-report:
	cargo llvm-cov \
		--all-features \
		--workspace \
		--html \
		--output-dir target/llvm-cov-html \
		--lcov \
		--output-path target/lcov.info \
		--fail-under-lines 95 \
		--fail-under-regions 95 \
		--fail-under-functions 95
	@echo "HTML report: target/llvm-cov-html/index.html"

# GrantFox campaign specific targets
build-grantfox:
	stellar contract build --release --profile optimized
	@if command -v wasm-opt >/dev/null 2>&1; then \
		wasm-opt target/wasm32v1-none/release/streampay-stream.wasm -o target/wasm32v1-none/release/streampay-stream.wasm \
			--zero-fill-i128 --flatten --remove-imported-globals --remove-unused-code --optimize-level=2 --shrink-level=1; \
		echo "Applied WASM optimization for GrantFox"; \
	else \
		echo "WASM optimizer not available, skipping optimization"; \
	fi
	ls -lh target/wasm32v1-none/release/*.wasm

test-grantfox:
	cd scripts && bash build-grantfox-contract.sh
	cd operations && bash deploy-grantfox.sh
test-all: test build-grantfox

test-all-grantfox: test-grantfox

# ── Criterion benchmark harness (GrantFox) ────────────────────────────────────
#
# Prerequisites: a native Rust toolchain (not wasm32).
#
# bench-compile  – build the benchmark binary without running it (fast CI check)
# bench          – run all groups; writes HTML reports to target/criterion/
# bench-<group>  – run a single group (substring match)
# bench-baseline – save a named baseline for future comparisons
#
# NOTE: run benches on a quiet machine for reliable numbers.
# Shared CI runners introduce timing noise; the CI workflow only compiles.

bench-compile:
	cargo bench --no-run

bench:
	cargo bench -- --output-format verbose

bench-create:
	cargo bench -- create_stream

bench-withdraw:
	cargo bench -- withdraw

bench-read:
	cargo bench -- "get_stream\|withdrawable\|stream_balance\|sender_stream_count\|max_streams_per_sender"

bench-lifecycle:
	cargo bench -- "pause\|resume\|settle\|cancel_stream\|amend_stream"

bench-admin:
	cargo bench -- "initialize\|init_with_token_allowlist\|set_paused\|set_admin\|set_token_allowed\|set_max_streams"

bench-baseline:
	@if [ -z "$(NAME)" ]; then \
		echo "Usage: make bench-baseline NAME=<baseline-name>"; exit 1; \
	fi
	cargo bench -- --save-baseline $(NAME)

bench-compare:
	@if [ -z "$(NAME)" ]; then \
		echo "Usage: make bench-compare NAME=<baseline-name>"; exit 1; \
	fi
	cargo bench -- --load-baseline $(NAME) --baseline $(NAME)

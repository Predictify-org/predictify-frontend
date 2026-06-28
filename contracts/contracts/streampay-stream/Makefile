default: build

all: test build grantfox-build

build:
	stellar contract build
	@ls -l target/wasm32v1-none/release/*.wasm

fmt:
	cargo fmt --all

clean:
	cargo clean

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

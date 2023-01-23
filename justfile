#!/usr/bin/env just --justfile

tesseractWasmUrl := "https://github.com/wydengyre/tesseract-wasm/releases/download/wydengyre-release-1/tesseract-wasm.zip"
tesseractWasmZipPath := "build/tesseract-wasm.zip"
tesseractWasmFilesPath := "deps/tesseract-wasm"

default:
    just --list --justfile {{justfile()}}

clean:
	rm -rf deps build dist

ci: ci-fmt lint deps test

ci-fmt:
    deno fmt --check deno test deno-test

fmt:
    deno fmt deno test deno-test

lint:
    deno lint deno test deno-test

update-deps:
    deno run -A https://deno.land/x/udd/main.ts import_map.json

deps:
    mkdir -p {{tesseractWasmFilesPath}} build
    curl --show-error --location --fail {{tesseractWasmUrl}} --output {{tesseractWasmZipPath}}
    unzip -q -o -d {{tesseractWasmFilesPath}} {{tesseractWasmZipPath}}

test: unit-test end-to-end-test

unit-test:
	deno test --check=all --unstable --allow-read --allow-write --allow-run deno

end-to-end-test:
	deno test --check=all --unstable --allow-read --allow-write --allow-run deno-test

build:
    mkdir -p dist
    deno bundle deno/main.ts dist/pgs-to-srt.js

docker-ci: clean docker-build-image docker-run-tests

# build the docker image for building the project
docker-build-image:
    docker build -f Dockerfile.build -t pgs-to-srt-test .

docker-run-tests:
    docker run pgs-to-srt-test

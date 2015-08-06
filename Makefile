# t-plus makefile
# author: David Rekow <d@davidrekow.com>
# copyright: David Rekow 2015


SHELL := /bin/bash

# vars
THIS_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
COVERAGE_DIR := $(THIS_DIR)/test/coverage

LIB_NAME := t-plus

.PHONY: all build clean distclean test test-ci

all: build

build: test
	@echo "Building $(LIB_NAME)..."
	@mkdir -p $(THIS_DIR)/dist
	@echo "Compiling and minifying dist package with Closure Compiler..."
	@-java -jar $(THIS_DIR)/node_modules/closure-compiler-stream/lib/compiler.jar \
		--debug false \
		--warning_level VERBOSE \
		--summary_detail_level 3 \
		--language_in ECMASCRIPT5 \
		--js $(THIS_DIR)/src/index.js \
		--compilation_level ADVANCED_OPTIMIZATIONS \
		--common_js_entry_module $(THIS_DIR)/src/index.js \
		--js_output_file $(THIS_DIR)/dist/$(LIB_NAME).min.js \
		--output_wrapper '(function () {%output%}).call(this);' \
		--use_types_for_optimization
	@echo "Build complete."

clean:
	@echo "Cleaning built files..."
	@-rm -rf $(THIS_DIR)/dist
	@echo "Cleaning test reports..."
	@-rm -rf $(COVERAGE_DIR)

distclean: clean
	@echo "Cleaning downloaded dependencies..."
	@-rm -rf $(THIS_DIR)/node_modules

test: $(THIS_DIR)/node_modules $(COVERAGE_DIR)
	@echo "Running $(LIB_NAME) package tests..."
	@multi="xunit=$(COVERAGE_DIR)/xunit.xml spec=-" \
		$(THIS_DIR)/node_modules/.bin/istanbul cover $(THIS_DIR)/node_modules/.bin/_mocha -- -R mocha-multi

test-ci: test
	@echo "Reporting coverage to coveralls..."
	@cat $(COVERAGE_DIR)/lcov.info | $(THIS_DIR)/node_modules/.bin/coveralls

$(THIS_DIR)/node_modules:
	@echo "Installing NPM build dependencies..."
	@npm install --save-dev

$(COVERAGE_DIR):
	@echo "Creating test report directories..."
	@mkdir -p $(COVERAGE_DIR)

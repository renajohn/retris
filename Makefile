IMAGE := ghcr.io/renajohn/retris
TAG   := $(or $(TAG),latest)

.PHONY: setup build push login

setup:
	git config core.hooksPath hooks

build:
	docker build -t $(IMAGE):$(TAG) .

push: build
	docker push $(IMAGE):$(TAG)

login:
	@echo "Authenticate with: echo $$GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"

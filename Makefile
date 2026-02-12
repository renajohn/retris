IMAGE := ghcr.io/renajohn/retris
TAG   := $(or $(TAG),latest)

.PHONY: build push login

build:
	docker build -t $(IMAGE):$(TAG) .

push: build
	docker push $(IMAGE):$(TAG)

login:
	@echo "Authenticate with: echo $$GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"

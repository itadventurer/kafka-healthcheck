# Kafka Healthcheck

Checks the health of a Kafka Cluster by sending a roundtrip
message. This tool can be used as a normal CLI script that returns
when the roundtrip was successful or it can start a webserver that
tests a roundtrip on each request.

## Installation

```sh
npm install -g kafka-healthcheck
```

## Getting Started

You do not need to create a topic. Kafka Healthcheck does it for you.

### Standalone

```sh
export KAFKA_URL=localhost:9092
export HEALTHCHECK_TOPIC=healthcheck
export REPLICATION_FACTOR=1
export DEBUG="wait-for-kafka*|kafka-healthcheck*"
unset HTTP_PORT
kafka-healthcheck
```

### As a server

```sh
export KAFKA_URL=localhost:9092
export HEALTHCHECK_TOPIC=healthcheck
export REPLICATION_FACTOR=1
export DEBUG="wait-for-kafka*|kafka-healthcheck*"
export HTTP_PORT=8080
kafka-healthcheck
```

## Configuration

* `KAFKA_URL`: URL of your Kafka Cluster
* `HEALTHCHECK_TOPIC`: Optional. Default: `healthcheck`
* `REPLICATION_FACTOR`: When creating the topic, what should be the
  replication factor?
* `DEBUG`: `wait-for-kafka*|kafka-healthcheck*` ← will show all relevant messages. set to
  `*` for all debug messages
* `HTTP_PORT`: (optional) If set, the http server will be started on
  that port.

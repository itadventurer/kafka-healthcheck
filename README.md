# Kafka Healthcheck

Checks the health of a Kafka Cluster by sending a roundtrip
message. This tool can be used as a normal CLI script that returns
when the roundtrip was successful or it can start a webserver that
tests a roundtrip on each request.

## Installation

```sh
npm install -g kafka-healthcheck
```

## Usage

Kafka Healthcheck can be used as a CLI tool or as a server which
listens for HTTP requests and checks the roundtrip time on each HTTP
request.

```sh
# Basic Configuration
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092
export HEALTHCHECK_TOPIC=healthcheck
export HEALTHCHECK_GROUP=healthcheck
```

### Ensure that the healthcheck topic is created (optional)

The `$HEALTHCHECK_TOPIC ` must exist before kafka-healthcheck is
started. If you need to create the topic programmatically, you can use
[wait-for-kafka](https://github.com/azapps/wait-for-kafka/):

```sh
# Do not forget the basic configuration!
# Optional!
npm install -g wait-for-kafka
export DEBUG="showcase:*" # optional
export REPLICATION_FACTOR=3 # recommended: number of brokers
export ENSURE_KAFKA_TOPICS='[{"topic": "'$HEALTHCHECK_TOPIC'","partitions": 1, "replicationFactor": '$REPLICATION_FACTOR'}]'
wait-for-kafka
```
### Standalone

```sh
# Do not forget the basic configuration!
unset HTTP_PORT
export DEBUG="kafka-healthcheck*" # Optional
kafka-healthcheck
```

### As a server

```sh
export HTTP_PORT=8080
export DEBUG="kafka-healthcheck*" # Optional
kafka-healthcheck
curl http://localhost:8080/
```

## Configuration

* `KAFKA_BOOTSTRAP_SERVERS`: URL of your Kafka Cluster
* `HEALTHCHECK_TOPIC`: Optional. Default: `healthcheck`
* `HEALTHCHECK_GROUP`: Optional. Default: `healthcheck`
* `DEBUG`: `kafka-healthcheck*` ← will show all relevant messages. set
  to `*` for all debug messages
* `HTTP_PORT`: (optional) If set, the http server will be started on
  that port.

### Additional Environment Variables

`kafka-healthcheck` supports all configuration parameters of
librdkafka as described in the [project
documentation](https://github.com/edenhill/librdkafka/blob/0.11.1.x/CONFIGURATION.md).

They are set via environment variables prefixed by `KAFKA_`. For
example the parameter `client.id` can be set by the `KAFKA_CLIENT_ID`
environment variable.

# License

kafka-healthcheck is licensed under the [Apache License](./LICENSE), Version 2.0

import kafka_utils from './kafka_utils';
import express from 'express';
import {performance} from 'perf_hooks';
import {session_id_gen} from './gen_utils';
import wait_for_kafka from 'wait-for-kafka';
const debug = require('debug')('kafka-healthcheck');

const msg2resolvers = {};

async function consume_event(event) {
    const resolve = msg2resolvers[event.msg_id];
    if(resolve) {
        const end_time = performance.now();
        const duration = end_time - event.start_time;
        delete msg2resolvers[event.msg_id];
        debug("Received " + event.msg_id + " Duration " + duration + " ms");
        resolve(duration);
    }
}

async function init(kafka_url, replication_factor, healthcheck_topic='healthcheck') {
    // Create topic if needed
    const topics_to_create = [{
        "topic": healthcheck_topic,
        "partitions": 1,
        "replicationFactor": replication_factor
    }];
    await wait_for_kafka(kafka_url, [], topics_to_create);
    // Create consumer
    const consumer = kafka_utils.create_consumer(kafka_url,
                                                 'healthcheck_' + process.env.HOSTNAME,
                                                 [healthcheck_topic]);
    kafka_utils.consume_messages(consumer, consume_event);
    debug("Started listening on topics", healthcheck_topic);

    // return producer
    const producer = await kafka_utils.create_producer(kafka_url, 'random');
    return (msg) => kafka_utils.produce_msgs(producer, healthcheck_topic, msg);
}

async function test_roundtrip(producefn) {
    return new Promise((resolve,reject) => {
        const session_id = session_id_gen();
        msg2resolvers[session_id] = resolve;
        const msg = {
            msg_id: session_id,
            start_time: performance.now()
        };
        producefn(msg)
            .then(() => debug("Send message: ",msg))
            .catch(reject);
    });
}

async function start_server(kafka_url, replication_factor, port, healthcheck_topic='healthcheck') {
    const producefn = await init(kafka_url, replication_factor, healthcheck_topic);
    const app = express();

    app.get('/', async function(req, res) {
        const duration = await test_roundtrip(producefn);
        res.send("OK. Duration: " + duration);
    });

    app.listen(port, () => debug('Example app listening on port ' + port + '!'));
}

async function run_healthcheck(kafka_url, replication_factor, healthcheck_topic='healthcheck') {
    const producefn = await init(kafka_url, replication_factor, healthcheck_topic);
    return test_roundtrip(producefn);
}

if(require.main === module) {
    const kafka_url = process.env.KAFKA_URL;
    const healthcheck_topic = process.env.HEALTHCHECK_TOPIC || 'healthcheck';
    var replication_factor;
    if(process.env.REPLICATION_FACTOR) {
        replication_factor = parseInt(process.env.REPLICATION_FACTOR);
    } else {
        console.error('Replication factor must be given. Set it to the number of brokers.');
        process.exit(1);
    }
    if(process.env.HTTP_PORT) {
        const port = parseInt(process.env.HTTP_PORT);
        start_server(kafka_url, replication_factor, port, healthcheck_topic);
    } else {
        run_healthcheck(kafka_url, replication_factor, healthcheck_topic)
            .then((duration) => {
                debug("OK. Duration: ", duration);
                process.exit(0);
            }).catch(e => {
                console.error("Error: ", e);
                process.exit(1);
            });
    }
}

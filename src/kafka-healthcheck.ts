#!/usr/bin/env node
import kafka_utils from './kafka_utils';
import express from 'express';
import { performance } from 'perf_hooks';
import { session_id_gen } from './gen_utils';
const debug = require('debug')('kafka-healthcheck');

const msg2resolvers = {};

async function consume_event(event) {
    const resolve = msg2resolvers[event.msg_id];
    if (resolve) {
        const end_time = performance.now();
        const duration = end_time - event.start_time;
        delete msg2resolvers[event.msg_id];
        debug("Received " + event.msg_id + " Duration " + duration + " ms");
        resolve(duration);
    }
}

async function init(healthcheck_group: String, healthcheck_topic: String) {
    const consumer = kafka_utils.create_consumer(healthcheck_group, [healthcheck_topic], {
        'fetch.wait.max.ms': 5,
        'fetch.error.backoff.ms': 5,
        'enable.auto.commit': false
    });
    kafka_utils.consume_messages(consumer, consume_event);
    debug("Started listening on topics", healthcheck_topic);

    // return producer
    const producer = await kafka_utils.create_producer('random');
    return (msg) => kafka_utils.produce_msgs(producer, healthcheck_topic, msg);
}

async function test_roundtrip(producefn) {
    return new Promise((resolve, reject) => {
        const session_id = session_id_gen();
        msg2resolvers[session_id] = resolve;
        const msg = {
            msg_id: session_id,
            start_time: performance.now()
        };
        producefn(msg)
            .then(() => debug("Send message: ", msg))
            .catch(reject);
    });
}

async function start_server(port, healthcheck_group: String, healthcheck_topic: String) {
    const producefn = await init(healthcheck_group, healthcheck_topic);
    const app = express();

    app.get('/', async function (req, res) {
        const duration = await test_roundtrip(producefn);
        res.send("OK. Duration: " + duration);
    });

    app.listen(port, () => debug('Example app listening on port ' + port + '!'));
}

async function run_healthcheck(healthcheck_group: String, healthcheck_topic: String) {
    const producefn = await init(healthcheck_group, healthcheck_topic);
    return test_roundtrip(producefn);
}

if (require.main === module) {
    const healthcheck_topic = process.env.HEALTHCHECK_TOPIC || 'healthcheck';
    const healthcheck_group = process.env.HEALTHCHECK_GROUP || 'healthcheck';
    if (process.env.HTTP_PORT) {
        const port = parseInt(process.env.HTTP_PORT);
        start_server(port, healthcheck_group, healthcheck_topic);
    } else {
        run_healthcheck(healthcheck_group, healthcheck_topic)
            .then((duration) => {
                debug("OK. Duration: ", duration);
                process.exit(0);
            }).catch(e => {
                console.error("Error: ", e);
                process.exit(1);
            });
    }
}

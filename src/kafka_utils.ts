import Kafka from 'node-rdkafka';

function create_consumer(kafka_host, group_id, topics) {
    const globalConfig = {
        'group.id': group_id,
        'metadata.broker.list': kafka_host,
        'fetch.wait.max.ms': 10,
        'fetch.min.bytes': 1,
        'fetch.error.backoff.ms': 10
    };
    const topicConfig = {};

    return Kafka.createReadStream(globalConfig, topicConfig, {
        topics: topics
    });
}

function consume_messages(consumer, on_success, on_error=null) {
    if(!on_error) {
        //@ts-ignore
        on_error = (err) => console.error('Kafka Error:', err);
    }
    consumer.on('error', on_error);
    consumer.on('data', function(message) {
        const event = JSON.parse(message.value.toString());
        on_success(event);
    });
}

async function create_producer(kafka_host, partitioner_type) {
    return new Promise((resolve,reject) => {
        var producer = new Kafka.Producer({
            'metadata.broker.list': kafka_host,
            'queue.buffering.max.ms': 0,
            'compression.codec': 'gzip',
            'retry.backoff.ms': 200,
            'message.send.max.retries': 10,
            'socket.keepalive.enable': true,
            'queue.buffering.max.messages': 1000,
            'batch.num.messages': 1000,
            'dr_cb': true
        },{});
        producer.connect();

        // Any errors we encounter, including connection errors
        producer.on('event.error', function(err) {
            console.error('Error from producer');
            console.error(err);
        })
        producer.on('ready', () => {
            var pollLoop = setInterval(() => producer.poll(), 100);
            resolve(producer);
        });
    });
}

async function produce_msgs(producer, topic, msgs, key=null) {
    return new Promise((resolve,reject) => {
        if(!Array.isArray(msgs)) {
            msgs = [msgs];
        }
        try {
            msgs.forEach(msg => {
                const json_msg = JSON.stringify(msg);
                producer.produce(
                    //topic
                    topic,
                    // partition
                    null,
                    // buffer with message
                    Buffer.from(json_msg),
                    // key
                    key,
                    // Timestamp
                    Date.now());
            });
            resolve();
        } catch(err) {
            reject(err);
        }
    });
}

export default {create_consumer, consume_messages,
                create_producer, produce_msgs};

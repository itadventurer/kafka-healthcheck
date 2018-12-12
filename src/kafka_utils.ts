import Kafka from 'node-rdkafka';

function get_env_config() {
    var additional_config = {};

    for (const key in process.env) {
        if(key.startsWith("KAFKA_")) {
            const value = process.env[key];
            const libKey = key.substring(6).toLowerCase().replace(/_/g,".");
            additional_config[libKey] = value;
        }
    }
    return additional_config;
}

function create_consumer(group_id, topics) {
    const additional_config = get_env_config();
    const globalConfig = {
        'group.id': group_id,
        'fetch.wait.max.ms': 10,
        'fetch.error.backoff.ms': 10,
        ...additional_config
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

async function create_producer(partitioner_type) {
    return new Promise((resolve,reject) => {
        const additional_config = get_env_config();

        const global_config = {
            'metadata.broker.list': additional_config['bootstrap.servers'],
            'queue.buffering.max.ms': 5,
            'compression.codec': 'gzip',
            'retry.backoff.ms': 200,
            'message.send.max.retries': 10,
            'socket.keepalive.enable': true,
            'queue.buffering.max.messages': 1000,
            'batch.num.messages': 1000,
            'dr_cb': true,
            ...additional_config
        }
        delete global_config['bootstrap.servers'];
        console.log(global_config);
        var producer = new Kafka.Producer(global_config,{});
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

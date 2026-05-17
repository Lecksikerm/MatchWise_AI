const maxConcurrency = Number(process.env.AI_CONCURRENCY) || 2;
const maxQueueSize = Number(process.env.AI_QUEUE_LIMIT) || 30;
let activeCount = 0;
const queue = [];

const processQueue = () => {
    if (activeCount >= maxConcurrency || queue.length === 0) {
        return;
    }

    const { task, resolve, reject } = queue.shift();
    activeCount += 1;

    Promise.resolve(task())
        .then(resolve)
        .catch(reject)
        .finally(() => {
            activeCount -= 1;
            processQueue();
        });
};

const run = async (task) => {
    if (queue.length >= maxQueueSize) {
        return Promise.reject(new Error('AI task queue is full. Please try again in a moment.'));
    }

    return new Promise((resolve, reject) => {
        queue.push({ task, resolve, reject });
        processQueue();
    });
};

module.exports = {
    run,
};

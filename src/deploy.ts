function throwIfNullOrUndefined<T = any>(value: T | null | undefined, message: string): value is T {
    if (value === null || value === undefined) {
        throw new Error(message);
    }

    return true;
}

const run = async () => {
    console.log(`Run service deploy: ${process.env.DEPLOY_SERVICE_ID}`);
};

run().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error(error);
    process.exit(1);
});

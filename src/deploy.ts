import { getDeployments, getDestinations, getEnv, matchDeployments, getWorkDir, getSources, Source } from './tools';
import { compose, ComposeDestination } from './deploy/index';

const run = async () => {
    const configPath = getEnv('DEPLOY_CONFIG_PATH');
    const serviceRepo = getEnv('DEPLOY_SERVICE_REPO');
    const serviceRef = getEnv('DEPLOY_SERVICE_REF');

    const deployments = await getDeployments(configPath);
    const destinations = await getDestinations(configPath);
    const sources = await getSources(configPath);
    const workDir = await getWorkDir();

    const matched = matchDeployments({
        repo: serviceRepo,
        ref: serviceRef,
        deployments,
    });

    if (matched.length === 0) {
        throw new Error(`Deployment for ${serviceRepo}:${serviceRef} not found`);
    }

    for (const dep of matched) {
        const dest = destinations.find((dest) => {
            return dest.id === dep.config.dest;
        });
        if (!dest) {
            continue;
        }

        let src: Array<Source> = [];
        const depSources = dep.config.sources;

        if (depSources) {
            src = sources.filter((src) => {
                return depSources.includes(src.id);
            });
        }

        const deployType = dest.id.split('/').shift();
        switch (deployType) {
            case 'compose':
                await compose(dep, dest as ComposeDestination, src, workDir);
                break;
            default:
                throw new Error(`Deploy type ${deployType} is not defined`);
        }
    }
};

run().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error(error);
    process.exit(1);
});

import { getDeployments, getDestinations, getEnv, matchDeployments, getWorkDir, getSources, Source } from './tools';
import { compose, cloudrun, ComposeDestination, CloudRunDestination } from './deploy/index';

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
        const destMatched = destinations.filter((dest) => {
            if (Array.isArray(dep.config.dest)) {
                return dep.config.dest.includes(dest.id);
            }

            return dest.id === dep.config.dest;
        });
        if (destMatched.length === 0) {
            continue;
        }

        let src: Array<Source> = [];
        const depSources = dep.config.sources;

        if (depSources) {
            src = sources.filter((src) => {
                return depSources.includes(src.id);
            });
        }

        for (const dest of destMatched) {
            const deployType = dest.id.split('/').shift();
            switch (deployType) {
                case 'compose':
                    await compose(dep, dest as ComposeDestination, src, workDir);
                    break;
                case 'cloudrun':
                    await cloudrun(dep, dest as CloudRunDestination, src, workDir);
                    break;
                default:
                    throw new Error(`Deploy type ${deployType} is not defined`);
            }
        }
    }
};

run().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error(error);
    process.exit(1);
});

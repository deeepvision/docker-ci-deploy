import * as fs from 'fs-extra';
import * as yaml from 'yaml';

export const getEnv = (key: string): string => {
    const value = process.env[key];

    if (value === null || value === undefined) {
        throw new Error(`${key} is not defined`);
    }

    return value;
};

interface ComposeDeploymentConfig {
    project?: string;
}
interface DeploymentConfig {
    repo: {
        url: string;
        branch?: string;
        tagPattern?: string;
        tag?: string;
    };
    dest: string;
    sources?: Array<string>;
    compose?: ComposeDeploymentConfig;
}
export interface Deployment {
    id: string;
    path: string;
    config: DeploymentConfig;
}
export interface Destination {
    id: string;
    config: {};
}
export interface Source {
    id: string;
    config: {
        type: string;
        server: string;
        user: string;
        pass: string;
    };
}

const extractDeploymentId = (path: string): string => {
    const parts = path.split('/');

    return parts.slice(parts.indexOf('srv') + 1).join('__');
};
const findDeploymentsInDir = async (dir: string): Promise<Array<Deployment>> => {
    const deployments: Array<Deployment> = [];

    const items = await fs.readdir(dir);
    for (const item of items) {
        const itemStat = await fs.stat(`${dir}/${item}`);
        if (itemStat.isDirectory()) {
            deployments.push(...await findDeploymentsInDir(`${dir}/${item}`));
        } else {
            if (item === 'deploy.yml') {
                const configRaw = await fs.readFile(`${dir}/${item}`);
                const config = yaml.parse(configRaw.toString('utf8'));

                deployments.push({
                    id: extractDeploymentId(dir),
                    path: dir,
                    config,
                });
            }
        }
    }

    return deployments;
};

export const getDeployments = async (configPath: string): Promise<Array<Deployment>> => {
    return findDeploymentsInDir(`${configPath}/srv`);
};

const extractDestId = (path: string): string => {
    const parts = path.split('/');

    return parts.slice(parts.indexOf('dest') + 1).join('/');
};
const findDestinationsInDir = async (dir: string): Promise<Array<Destination>> => {
    const deployments: Array<Destination> = [];

    const items = await fs.readdir(dir);
    for (const item of items) {
        const itemStat = await fs.stat(`${dir}/${item}`);
        if (itemStat.isDirectory()) {
            deployments.push(...await findDestinationsInDir(`${dir}/${item}`));
        } else {
            if (item.includes('.yml')) {
                const configRaw = await fs.readFile(`${dir}/${item}`);
                const config = yaml.parse(configRaw.toString('utf8'));

                deployments.push({
                    id: extractDestId(`${dir}/${item.replace('.yml', '')}`),
                    config,
                });
            }
        }
    }

    return deployments;
};
export const getDestinations = async (configPath: string): Promise<Array<Destination>> => {
    return findDestinationsInDir(`${configPath}/dest`);
};

const extractSourceId = (path: string): string => {
    const parts = path.split('/');

    return parts.slice(parts.indexOf('source') + 1).join('/');
};
const findSourcesInDir = async (dir: string): Promise<Array<Source>> => {
    const sources: Array<Source> = [];

    const items = await fs.readdir(dir);
    for (const item of items) {
        const itemStat = await fs.stat(`${dir}/${item}`);
        if (itemStat.isDirectory()) {
            sources.push(...await findSourcesInDir(`${dir}/${item}`));
        } else {
            if (item.includes('.yml')) {
                const configRaw = await fs.readFile(`${dir}/${item}`);
                const config = yaml.parse(configRaw.toString('utf8'));

                sources.push({
                    id: extractSourceId(`${dir}/${item.replace('.yml', '')}`),
                    config,
                });
            }
        }
    }

    return sources;
};
export const getSources = async (configPath: string): Promise<Array<Source>> => {
    return findSourcesInDir(`${configPath}/source`);
};

interface MatchDeploymentProps {
    repo: string;
    ref: string;
    deployments: Array<Deployment>;
}
export const matchDeployments = (props: MatchDeploymentProps): Array<Deployment> => {
    const mathed = [];

    for (const d of props.deployments) {
        if (d.config.repo.url !== props.repo) {
            continue;
        }

        const refParts = props.ref.split('/');
        if (refParts[0] === 'heads') {
            if (refParts.slice(1).join('/') === d.config.repo.branch) {
                mathed.push(d);
            }
        }
        if (refParts[0] === 'tags') {
            const tagExpr = new RegExp(`^${d.config.repo.tagPattern}$`, 'u');

            if (refParts[1].match(tagExpr)) {
                d.config.repo.tag = refParts[1];
                mathed.push(d);
            }
        }
    }

    return mathed;
};

export const getWorkDir = async (): Promise<string> => {
    const workDir = process.cwd() + '/deploy-data';

    await fs.ensureDir(workDir);

    return workDir;
};

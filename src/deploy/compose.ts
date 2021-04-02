import * as fs from 'fs-extra';
import * as util from 'util';
import * as hb from 'handlebars';
import { exec as execCb } from 'child_process';
import { Deployment, Destination, Source } from '../tools';

const exec = util.promisify(execCb);

export interface ComposeDestination extends Destination {
    id: string;
    config: {
        host: string;
        certs: {
            ca: string;
            cert: string;
            key: string;
        };
    };
}
interface ExecOutput {
    stdout: string;
    stderr: string;
}
interface AuthConfig {
    auths: {
        [server: string]: {
            auth: string;
        }
    }
}

export const compose = async (deployment: Deployment, destination: ComposeDestination, sources: Array<Source>, workDir: string) => {
    console.log(`Deploying ${deployment.id} to ${destination.id}...`);

    let output: ExecOutput | null = null;
    const depYaml = `${workDir}/compose.yml`;
    const projectName = deployment.config.compose?.project ? deployment.config.compose.project : deployment.id;

    // Prepare the compose.yml
    const depConfigData = await fs.readFile(`${deployment.path}/compose.yml`);
    let depConfigFinalData = depConfigData.toString('utf8');
    if (deployment.config.repo.tag) {
        const tpl = hb.compile(depConfigFinalData);
        depConfigFinalData = tpl({
            version: deployment.config.repo.tag.replace('v', ''),
        });
    }
    await fs.writeFile(depYaml, depConfigFinalData);

    // Prepare the Docker certs
    const certsPath = `${workDir}/certs`;

    await fs.outputFile(`${certsPath}/ca.pem`, destination.config.certs.ca);
    await fs.outputFile(`${certsPath}/cert.pem`, destination.config.certs.cert);
    await fs.outputFile(`${certsPath}/key.pem`, destination.config.certs.key);

    const env = {
        DOCKER_CERT_PATH: certsPath,
        DOCKER_TLS_VERIFY: '1',
        DOCKER_HOST: `tcp://${destination.config.host}:2376`,
        LD_LIBRARY_PATH: '/lib:/usr/lib',
        PATH: '/sbin:/usr/sbin:/bin:/usr/bin:/usr/local/bin',
    };

    // Login to the registries
    const authConfig: AuthConfig = {
        auths: {},
    };
    for (const s of sources) {
        const authBuff = Buffer.from(`${s.config.user}:${s.config.pass}`);
        authConfig.auths[s.config.server] = {
            auth: authBuff.toString('base64'),
        };
    }
    await fs.outputFile('/root/.docker/config.json', JSON.stringify(authConfig));

    console.log('Pulling images');
    output = await exec(`docker-compose -f ${depYaml} -p ${projectName} pull`, { env });
    console.log(output?.stderr);
    console.log('Starting containers');
    output = await exec(`docker-compose -f ${depYaml} -p ${projectName} up -d`, { env });
    console.log(output?.stderr);

    // Clean secure data
    await fs.remove(certsPath);
    await fs.remove('/root/.docker/config.json');
};

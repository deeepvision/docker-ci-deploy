import * as fs from 'fs-extra';
import * as util from 'util';
import { exec as execCb } from 'child_process';
import { Deployment, Destination, Source } from '../tools';
// import * as Bluebird from 'bluebird';

const exec = util.promisify(execCb);

interface ComposeDestination extends Destination {
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
    let output: ExecOutput | null = null;
    const depYaml = `${workDir}/compose.yml`;

    // Prepare the compose.yml
    const depConfigData = await fs.readFile(`${deployment.path}/compose.yml`);
    await fs.writeFile(depYaml, depConfigData);

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

    //
    // if (serviceVersion) {
    //     await replace({
    //         files: serviceYaml,
    //         from: /{version}/g,
    //         to: serviceVersion.replace('v', ''),
    //     });
    // }
    //

    console.log('Pulling images');
    output = await exec(`docker-compose --verbose -f ${depYaml} -p ${deployment.id} pull`, { env });
    console.log(output);
    console.log('Starting containers');
    output = await exec(`docker-compose -f ${depYaml} -p ${deployment.id} up -d`, { env });
    console.log(output);
    //
    // await fs.remove(certsPath);    let serviceYaml = `${projectRoot}/${repo}.yml`;
    // if (tag) {
    //     serviceYaml = `${projectRoot}/${repo}/${tag}.yml`;
    // }
    // if (serviceId) {
    //     serviceYaml = `${projectRoot}/${repo}/${serviceId}.yml`;
    // }
    //
    // console.log(`Using ${serviceYaml} for service deploy`);
    // assert(await fs.pathExists(serviceYaml));
    //
    // const certsPath = `${scriptRoot}/certs`;
    //
    // await fs.outputFile(`${certsPath}/ca.pem`, certs.ca);
    // await fs.outputFile(`${certsPath}/cert.pem`, certs.cert);
    // await fs.outputFile(`${certsPath}/key.pem`, certs.key);
    //
    // const env = {
    //     DOCKER_CERT_PATH: certsPath,
    //     DOCKER_TLS_VERIFY: '1',
    //     DOCKER_HOST: `tcp://${service.host}:2376`,
    //     LD_LIBRARY_PATH: '/lib:/usr/lib',
    //     PATH: '/sbin:/usr/sbin:/bin:/usr/bin:/usr/local/bin',
    // };
    //
    // if (serviceVersion) {
    //     await replace({
    //         files: serviceYaml,
    //         from: /{version}/g,
    //         to: serviceVersion.replace('v', ''),
    //     });
    // }
    //
    // console.log(
    //     await exec(`docker-compose -f ${serviceYaml} -p ${service.project} pull`, { env })
    // );
    // console.log(
    //     await exec(`docker-compose -f ${serviceYaml} -p ${service.project} up -d`, { env })
    // );
    //
    // await fs.remove(certsPath);
};
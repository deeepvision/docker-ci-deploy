import { createId, Deployment, Destination, Source } from '../tools';
import * as fs from 'fs-extra';
import * as yaml from 'yaml';
import { google, run_v1 } from 'googleapis';
const run = google.run('v1');
const cloudresourcemanager = google.cloudresourcemanager('v1');

export interface CloudRunDestination extends Destination {
    id: string;
    config: {
        projectId: string;
        serviceAccount: {
            email: string;
            privateKey: string;
        };
    };
}

export const cloudrun = async (deployment: Deployment, destination: CloudRunDestination, sources: Array<Source>, workDir: string) => {
    console.log(`Deploying ${deployment.id} to ${destination.id}...`);

    if (!deployment.config.cloudrun) {
        throw new Error('Deploy region must be specified');
    }

    const serviceYaml = `${deployment.path}/service.yml`;
    const serviceConfigs = yaml.parseAllDocuments(
        await fs.readFile(serviceYaml, { encoding: 'utf-8' })
    );

    const serviceMeta = serviceConfigs[0].toJSON();
    const serviceKnativeSpec = serviceConfigs[1].toJSON() as run_v1.Schema$Service;
    const serviceName = serviceKnativeSpec?.metadata?.name;
    if (!serviceName) {
        throw new Error(`Service name is not defined in Knative spec`);
    }

    // Add label to force creating of new revision
    if (!serviceKnativeSpec.metadata?.labels) {
        serviceKnativeSpec.metadata.labels = {};
    }
    serviceKnativeSpec.metadata.labels['deepops/build'] = createId('b');

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: destination.config.serviceAccount.email,
            private_key: destination.config.serviceAccount.privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const authClient = await auth.getClient();
    google.options({ auth: authClient });

    const projectId = destination.config.projectId;
    const projectRes = await cloudresourcemanager.projects.get({ projectId });
    const project = projectRes.data;

    let activeService: run_v1.Schema$Service | null = null;
    try {
        const serviceRes = await run.namespaces.services.get({
            name: `namespaces/${project.projectNumber}/services/${serviceName}`,
        }, {
            rootUrl: `https://${deployment.config.cloudrun.region}-run.googleapis.com/`,
        });

        activeService = serviceRes.data;
    } catch (error) {
        if (error.code !== 404) {
            throw error;
        }
    }

    if (activeService) {
        console.log(`Updating service "${activeService.metadata?.name}"`);
        const res = await run.namespaces.services.replaceService({
            name: `namespaces/${project.projectNumber}/services/${serviceName}`,
            requestBody: serviceKnativeSpec,
        }, {
            rootUrl: `https://${deployment.config.cloudrun.region}-run.googleapis.com/`,
        });
        console.log(res);

    } else {
        console.log(`Creating new service "namespaces/${project.projectNumber}/services/${serviceName}"`);
        const serviceRes = await run.namespaces.services.create({
            parent: `namespaces/${project.projectNumber}`,
            requestBody: serviceKnativeSpec,
        }, {
            rootUrl: `https://${deployment.config.cloudrun.region}-run.googleapis.com/`,
        });
        if (serviceRes.status === 200) {
            console.log(`Service successfully created: ${JSON.stringify(serviceRes.data)}`);
        } else {
            console.log('Something goes wrong...');
        }

        const policyRes = await run.projects.locations.services.setIamPolicy({
            resource: `projects/${projectId}/locations/${deployment.config.cloudrun.region}/services/${serviceName}`,
            requestBody: {
                policy: {
                    bindings: [
                        {
                            members: ['allUsers'],
                            role: 'roles/run.invoker',
                        },
                    ],
                },
            },
        });

        if (policyRes.status === 200) {
            console.log(`Public access enabled: ${JSON.stringify(policyRes.data)}`);
        } else {
            console.log('Something goes wrong on setting policy...');
        }


    }
}

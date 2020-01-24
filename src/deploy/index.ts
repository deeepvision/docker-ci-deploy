import { compose } from './compose';
import { Destination } from '../tools';

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


export {
    compose,
    ComposeDestination,
};

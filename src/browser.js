import HttpShell from './core/HttpShell';
import HttpBrowser from './core/HttpBrowser';

const createHttpClient = (globalOptions = {}) => {

	const { 
		apis, 
		baseUrl,
		http = HttpBrowser.http,
		...defaultOptions 
	} = globalOptions;
	const clientWrapper = new HttpShell({ http, apis, baseUrl });
	
	const allowMethod = ['ajax', 'get', 'post', 'put', 'delete', 'option', 'form'];

	const client = {};
	allowMethod.forEach(m => {
		client[m] = async (userOptions) => {
			return clientWrapper[m]({ ...defaultOptions, ...userOptions });
		};
	});

	return client;
};

export const { ajax } = createHttpClient();

export default createHttpClient;
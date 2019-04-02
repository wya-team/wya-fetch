import HttpError, { ERROR_CODE } from './HttpError';
import { getPropByPath } from '../utils/index';

class HttpAdapter {
	static http = (opts = {}) => {
		let {
			getInstance,
			method,
			useXHR
		} = opts;

		let fn = (useXHR || /(JSONP|FORM)$/.test(method) || typeof fetch === 'undefined')  
			? HttpAdapter.XHRInvoke 
			: HttpAdapter.fetchInvoke;

		// let fn = HttpAdapter.XHRInvoke;
		return fn(opts);
	}
	static ssrInvoke = (opts = {}) => {
		// return new Promise(() => {

		// });
	}
	static XHRInvoke = (opts = {}) => {
		return new Promise((resolve, reject) => {
			let {
				onLoaded,
				onLoading,
				getInstance,
				onProgress,
				url,
				param,
				method,
				loading,
				headers,
				async,
				debug,
				credentials
			} = opts;

			let xhr = new XMLHttpRequest();

			let tag = `${url}: ${new Date().getTime()}`;

			debug && console.time(`[@wya/http]: ${tag}`);
			// 用于取消
			getInstance && getInstance({
				xhr,
				options: opts,
				cancel: HttpAdapter.cancel.bind(null, { xhr, options: opts, reject }), 
			});

			loading && onLoading({ options: opts, xhr });

			xhr.onreadystatechange = () => {
				if (xhr.readyState == 4) {
					loading && onLoaded({ options: opts, xhr });
					if (xhr.status >= 200 && xhr.status < 300) {
						debug && console.timeEnd(`[@wya/http]: ${tag}`);
						resolve(xhr.responseText || "{}");
					} else {
						if (xhr.status === 0 && xhr.__ABORTED__ === true){
							// 主动取消
							return;
						}
						reject(new HttpError({
							code: ERROR_CODE.HTTP_STATUS_ERROR,
							httpStatus: xhr.status,
						}));
					}
					xhr = null;
				}
			};

			const result = HttpAdapter.getOptions(opts); 

			if (method === 'JSONP') {
				if (!param['callback']) {
					reject({
						status: 0
					});
				}

				window[param['callback']] = (data) => {
					resolve(data);
				};
				let script = document.createElement("script");
				let head = document.getElementsByTagName("head")[0];
				script.src = result.url;
				head.appendChild(script);
				return;
			} 

			if (method === 'FORM') {
				xhr.upload.onprogress = (e) => {
					// e.lengthComputable
					if (e.total > 0) {
						e._percent = e.loaded / e.total * 100;
						e.percent = (e._percent).toFixed(2);
					}
					onProgress && onProgress(e);
				};
			}
			xhr.open(result.method, result.url, async);
			xhr.withCredentials = !!credentials;

			for (const h in result.headers) {
				if (result.headers.hasOwnProperty(h) && result.headers[h] !== null) {
					xhr.setRequestHeader(h, result.headers[h]);
				}
			}

			xhr.send(result.body);
		});
	}
	static cancel({ xhr, options, reject }) {
		if (xhr instanceof XMLHttpRequest) {
			xhr.__ABORTED__ = true;
			xhr.abort();
			xhr = null;
		}
		options.setOver && options.setOver(new HttpError({
			code: ERROR_CODE.HTTP_CANCEL
		}));

		// TODO: 检验如果不reject会不会造成内存泄漏
		// reject();
	}
	static fetchInvoke = (opts = {}) => {
		const {
			debug,
			credentials,
			loading,
			onLoaded,
			onLoading,
			getInstance
		} = opts;
		let { url, headers, body, method } = HttpAdapter.getOptions(opts);

		let tag = `${opts.url}: ${new Date().getTime()}`;

		debug && console.time(`[@wya/http]: ${tag}`);

		return new Promise((resolve, reject) => {
			loading && onLoading({ options: opts });
			// 用于取消
			getInstance && getInstance({
				cancel: HttpAdapter.cancel.bind(null, { options: opts, reject }), 
			});

			fetch(url, { headers, body, credentials, method }).then((res) => {
				if (res.status >= 200 && res.status < 300) {
					resolve(res.json());
				} else {
					reject(new HttpError({
						code: ERROR_CODE.HTTP_STATUS_ERROR,
						httpStatus: res.status,
					}));
				}
			}).catch((res) => { // 跨域或其他
				reject(res);
			}).finally(() => {
				loading && onLoaded({ options: opts });
				debug && console.timeEnd(`[@wya/http]: ${tag}`);
			});
		});
	}
	static getOptions = (options) => {
		let { param, allowEmptyString, url, requestType } = options;

		let isJson = requestType === 'json';
		let isFormDataJson = requestType === 'form-data:json';

		// /repo/{books_id}/{article_id} 解析RESTFUL URL 或者动 态的;
		let dynamic = /\{([\s\S]{1,}?(\}?)+)\}/g;
		if (dynamic.test(url)) {
			let delTmp = [];
			url = url.replace(dynamic, key => {
				let k = key.replace(/(\{|\}|\s)/g, '');
				delTmp.push(k);
				return getPropByPath(param, k).value || key;
			});

			delTmp.forEach(i => param[i] && delete param[i]);
		}
		

		let paramArray = [];
		let paramString = '';
		for (let key in param) {
			/**
			 * 过滤掉值为null, undefined, ''情况
			 */
			if (param[key] || param[key] === false || param[key] === 0  || (allowEmptyString && param[key] === '') ) {
				paramArray.push(key + '=' + encodeURIComponent(param[key]));
			}
		}

		if (/(JSONP|GET|DELETE)$/.test(options.method) && paramArray.length > 0) {
			url += (url.indexOf('?') > -1 ? '&' : '?') + paramArray.join('&');
		}

		let headers = {
			'Accept': '*/*',
			'X-Requested-With': 'XMLHttpRequest'
		};
		let method = options.method;


		let body = undefined;

		// 主动添加Header
		if ((/(PUT|POST|DELETE)$/.test(options.method))) { // PUT + POST + DELETE
			headers['Content-Type'] = isJson
				? `application/json;charset=utf-8` 
				: `application/x-www-form-urlencoded`;
			if (isJson) {
				body = typeof options.param === 'object'
					? JSON.stringify(param)
					: undefined;
			} else {
				body = isFormDataJson
					? `data=${encodeURIComponent(JSON.stringify(param))}` // 业务需要
					: paramArray.join('&');
			}
		} else if (options.method === 'FORM') {

			// headers['Content-Type'] = 'multipart/form-data';
			headers['Content-Type'] = null; // 自动生成代码片段
			method = 'POST';

			let formData = new FormData();

			// 参数
			if (param) {
				Object.keys(param).map(key => {
					let fileType = Object.prototype.toString.call(param[key]);
					let fileName = undefined;
					if (fileType === '[object Blob]') {
						fileName = param[key].name || fileName;

					}
					fileName 
						? formData.append(key, param[key], fileName)
						: formData.append(key, param[key]); // 特殊处理
				});
			}
			body = formData;
		}

		return {
			url,
			method,
			headers: { ...headers, ...options.headers },
			body
		};
	};
}

export default HttpAdapter;

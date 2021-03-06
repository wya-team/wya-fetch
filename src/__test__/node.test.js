import createHttpClient, { HttpHelper } from '..';
import { ERROR_CODE } from '../core/HttpError';

describe('node.js', () => {
	// 设置20秒超时
	jest.setTimeout(20000); 
	let $ = createHttpClient({
		dynamic: true,
		onAfter: (res) => {
			expect(typeof res).toBe('object');
		},
		onBefore: (res) => {
			expect(typeof res).toBe('object');
		}
	});

	test('Basic', async () => {
		expect(typeof $.ajax).toBe('function');
	});
	if (!IS_SERVER) return;
	test('无URL验证错误', async () => {
		try {
			let res = await $.ajax();
		} catch (e) {
			expect(e.code).toBe(ERROR_CODE.HTTP_URL_EMPTY);
		}
	});

	test('动态的URL验证', async () => {
		try {
			let res = await $.ajax({
				type: 'POST',
				url: 'http://0.0.0.0:8833{config.prefix}/repo/{extra.books_id}/:extra.article_id/:method/:author?page={page}&size={size}',
				param: {
					config: {
						prefix: '/api'
					},
					extra: {
						books_id: 1,
						article_id: 1	
					},
					method: 'delete',
					author: '',
					page: 200,
					
					role: 'admin'
				},
				responseExtra: true
			});
		} catch (e) {
			// 与xhr表现不一致
			expect(e.url).toBe(`http://0.0.0.0:8833/api/repo/1/1/delete?page=200&size=`);
		}
	});

	test('localData验证: status = 1', async () => {
		try {
			let options = {
				localData: {
					status: 1,
					data: {
						user: 'wya'
					}
				}
			};
			let res = await $.ajax(options);
			expect(res.data.user).toBe('wya');
		} catch (res) {
			throw new Error(res);
		}
	});

	test('localData验证: status = 0', async () => {
		try {
			let options = {
				localData: {
					status: 0,
					data: {
						user: 'wya'
					}
				}
			};
			await $.ajax(options);
		} catch (res) {
			expect(res.data.user).toBe('wya');
		}
	});

	test('localData验证: status = null', async () => {
		try {
			let options = {
				localData: {
					status: null,
					data: {
						user: 'wya'
					}
				}
			};
			await $.ajax(options);
		} catch (res) {
			expect(res.data.user).toBe('wya');
		}
	});

	test('server验证: status = 1', async () => {
		try {
			let options = {
				url: 'http://0.0.0.0:8833/',
				credentials: 'omit', // cors下关闭
				onAfter: ({ response }) => {
					return {
						status: 1,
						data: {
							...response
						}
					};
				}
			};

			let res = await $.ajax(options);
			expect(res.data.login).toBe('wya-team');
		} catch (res) {
			throw new Error(res);
		}
	});

	test('server验证: status = 0', async () => {
		try {
			let options = {
				url: 'http://0.0.0.0:8833/',
				credentials: 'omit', // cors下关闭
			};

			let res = await $.ajax(options);
		} catch (res) {
			expect(res.status).toBe(0);
			expect(res.code).toBe(ERROR_CODE.HTTP_FORCE_DESTROY);
		}
	});

	test('server验证: onOther', async () => {
		try {
			let options = {
				url: 'http://0.0.0.0:8833/',
				credentials: 'omit', // cors下关闭
				onOther: ({ response, options, resolve, reject }) => {
					expect(response.login).toBe('wya-team');
				}
			};

			let res = await $.ajax(options);
		} catch (res) {
			expect(res.code).toBe(ERROR_CODE.HTTP_FORCE_DESTROY);
		}
	});

	test('server验证: onOther 错误捕获', async () => {
		try {
			let options = {
				url: 'http://0.0.0.0:8833/',
				credentials: 'omit', // cors下关闭
				debug: false,
				onOther: ({ response, options, resolve, reject }) => {
					throw new Error('程序内部执行错误'); // 被catch捕获
				}
			};

			let res = await $.ajax(options);
		} catch (res) {
			expect(res.code).toBe(ERROR_CODE.HTTP_CODE_ILLEGAL);
			expect(res.exception.message).toBe('程序内部执行错误');
		}
	});

	test('server验证: onLoading 错误捕获', async () => {
		let count = 0;
		try {
			let options = {
				url: 'http://0.0.0.0:8833/',
				credentials: 'omit', // cors下关闭
				debug: false,
				onLoading: () => {
					count++;
				},
				onLoaded: () => {
					count++;
				}
			};

			let res = await $.ajax(options);
		} catch (res) {
			expect(res.code).toBe(ERROR_CODE.HTTP_FORCE_DESTROY);
		} finally {
			expect(count).toBe(2);
		}
	});

	test('server验证: 非JSON返回', async () => {
		let count = 0;
		try {
			let options = {
				url: 'http://0.0.0.0:8833/?result=<svg></svg>',
				credentials: 'omit',
				debug: false,
				onLoading: () => {
					count++;
				},
				onLoaded: () => {
					count++;
				},
				onAfter: ({ response }) => {
					expect(decodeURI(response.data)).toBe("<svg></svg>");
				}
			};

			let res = await $.ajax(options);
		} catch (res) {
			expect(res.code).toBe(ERROR_CODE.HTTP_RESPONSE_PARSING_FAILED);
		} finally {
			expect(count).toBe(2);
		}
	});

	test('server验证: 无返回值，但为200', async () => {
		let count = 0;
		try {
			let options = {
				url: 'http://0.0.0.0:8833/?result=',
				credentials: 'omit',
				debug: false,
				onLoading: () => {
					count++;
				},
				onLoaded: () => {
					count++;
				},
				onAfter: ({ response }) => {
					expect(response.httpStatus).toBe(200);

					return {
						status: 1,
						data: {
							user: 'wya'
						}
					};
				}
			};

			let res = await $.ajax(options);

			expect(res.data.user).toBe('wya');
		} catch (res) {
			console.log(res);
		} finally {
			expect(count).toBe(2);
		}
	});
	
	test('HttpHelper', async () => {
		try {
			expect(HttpHelper.requests.length).toBe(0);

			let options = {
				url: 'http://0.0.0.0:8833/',
				credentials: 'omit', // cors下关闭
			};

			let request = $.ajax(options).catch((res) => {
				expect(res.code).toBe(ERROR_CODE.HTTP_CANCEL);
			});

			// onBefore 会形成一个微任务， HttpHelper.add属于微任务范畴
			await new Promise(r => setTimeout(r, 10));

			expect(HttpHelper.requests.length).toBe(1);

			HttpHelper.cancelAll();
			expect(HttpHelper.requests.length).toBe(0);
		} catch (e) {
			throw new Error(e.message);
		}
	});
});

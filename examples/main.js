import { ajax } from '../src/main';
// const request = ajax({
// 	url: 'https://managexcx.ruishan666.com/marketing/index/add.json'
// 	// url: `http://localhost:3000/api/test`
// }).then((res) => {
// 	console.log(res, 0);
// }).catch((res) => {
// 	console.log(res);
// });
// setTimeout(() => {
// 	request.cancel();
// }, Math.random() * 700);
// 
// 
// 


document.querySelector('input').addEventListener('change', (e) => {
	const request = ajax({
		url: 'https://wyaoa.ruishan666.com/uploadfile/upimg.json?action=uploadimage&encode=utf-8&code=xcx',
		type: "FORM",
		param: {
			// filename: Date.now(),
			file: e.target.files[0]
		},
		onBefore: (opts) => {
			let url = opts.url;
			let paramArray = [`token=${2222}`];
			return Promise.resolve({
				...opts,
				url: url += (url.indexOf('?') > -1 ? '&' : '?') + paramArray.join('&')
			});
			
		},
		onProgress: (e) => {
			console.log(e.percent);
		}
	}).then((res) => {
		console.log(res, 0);
	}).catch((res) => {
		console.log(res);
	});
});
const mustache = require('mustache'),
objectToFormData = require('object-to-formdata'),
_ = require('lodash'),
mimeTypes = require('mime-types'),
fs = require('fs'),
FormData = require('form-data');

module.exports = function (RED) {
	function httpSendMultipart(n) {
		RED.nodes.createNode(this, n);
		let node = this,
		nodeUrl = n.url,
		debug = false,
        isTemplatedUrl = (nodeUrl || "").indexOf("{{") != -1;

		this.ret = n.ret || "txt";
		
		this.reqTimeout = 60000;

		if (RED.settings.httpRequestTimeout) {
			this.reqTimeout = parseInt(RED.settings.httpRequestTimeout) || 60000;
		}

		this.on("input", function (msg) {
				if(msg.debug !== undefined) {
					debug = msg.debug;
				}

				if(debug) console.log("msg.payload", JSON.stringify(msg.payload));

				node.status({
					fill: "blue",
					shape: "dot",
					text: "Sending multipart request..."
				});

				let url = nodeUrl;
				
				if (isTemplatedUrl) {
					url = mustache.render(nodeUrl, msg);
				}
				
				if (!url) {
					node.error(RED._("httpSendMultipart.errors.no-url"), msg);

					node.status({
						fill: "red",
						shape: "dot",
						text: (RED._("httpSendMultipart.errors.no-url"))
					});

					return;
				}

				if (this.credentials && this.credentials.user) {
					let urlTail = url.substring(url.indexOf('://') + 3),
					username = this.credentials.user,
					password = this.credentials.password;

					url = `https://${username}:${password}@${urlTail}`;
				}

				
				let formData = new FormData(),
				files = msg.files || [];

				try {
					if (!_.isEmpty(files)) {
						if(debug) console.log(files);
						
						files.forEach((file) => {
							if (!file.fieldname || !file.filepath) {
								throw new Error("httpSendMultipart.errors.bad-file-config")
							}
	
							formData.append(file.fieldname, fs.createReadStream(file.filepath), {
								filename: file.filename || file.filepath,
								contentType: mimeTypes.lookup(file.filepath)
							});
						});
					}
				} catch (error) {
					if(debug) console.log(error);

					node.error(error.message, files);

					node.status({
						fill: "red",
						shape: "dot",
						text: (RED._("httpSendMultipart.errors.bad-file-config"))
					});

					return;
				}
				

				if(!_.isEmpty(msg.payload)) {
					formData = objectToFormData.serialize(msg.payload, { indices: true }, formData );
				}
				
				formData.submit(url,
					function (err, res) {

					if (err || !res) {
						let statusText = "Unexpected error";
						if (err) {
							statusText = err.message;
						} else if (!resp) {
							statusText = "No response object";
						}
						node.status({
							fill: "red",
							shape: "dot",
							text: statusText
						});

					} else {
						res.resume();
						let body = []
						res.on('data', (chunk) => {
							if(debug) console.log(`BODY: ${chunk}`);
							body.push(chunk)
							});

							res.on('end', () => {
							if(debug) console.log('No more data in response.');

							if(debug) console.log("msg.statusCode "+res.statusCode);

							if(res.statusCode !== 200){
								if(debug) console.log("msg.statusCode "+res.statusCode);
								node.status({
									fill: "red",
									shape: "dot",
									text: (RED._("node-red-contrib-send-form.errors.error-status-code") + " ["+res.statusCode+"]")
								});
							} else {
								if(debug) console.log("msg.statusCode "+res.statusCode);
								node.status({
								});
							}

							body = Buffer.concat(body)

							switch(n.ret) {
								case 'bin': {
									msg.payload = body
									break
								}
								case 'obj': {
									switch(res.headers["content-type"]) {
										case 'application/json':
										case 'application/json; charset=utf-8': {
											body = JSON.parse(body);

											break;
										}
									}

									msg.payload = {
										body: body,
										headers: res.headers,
										statusCode: res.statusCode
									}
									break
								}
								default: {
									msg.payload = body.toString()
								}
							}

							node.send(msg);
							});  						
					}
				});
		});
	}

	RED.nodes.registerType("http-request-multipart-formdata", httpSendMultipart, {
		credentials: {
			user: {
				type: "text"
			},
			password: {
				type: "password"
			}
		}
	});

};

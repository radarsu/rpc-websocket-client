"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
/* tslint:disable:no-var-requires */
const fastJson = require('fast-json-stringify');
const WsImpl = require('isomorphic-ws');
var RpcVersions;
(function (RpcVersions) {
    RpcVersions["RPC_VERSION"] = "2.0";
})(RpcVersions = exports.RpcVersions || (exports.RpcVersions = {}));
class RpcWebSocketClient {
    // constructor
    /**
     * Does not start WebSocket connection!
     * You need to call connect() method first.
     * @memberof RpcWebSocketClient
     */
    constructor() {
        this.idAwaiter = {};
        this.onOpenHandlers = [];
        this.onAnyMessageHandlers = [];
        this.onNotification = [];
        this.onRequest = [];
        this.onSuccessResponse = [];
        this.onErrorResponse = [];
        this.onErrorHandlers = [];
        this.onCloseHandlers = [];
        this.config = {
            responseTimeout: 10000,
        };
        this.ws = undefined;
    }
    // public
    /**
     * Starts WebSocket connection. Returns Promise when connection is established.
     * @param {string} url
     * @param {(string | string[])} [protocols]
     * @memberof RpcWebSocketClient
     */
    async connect(url, protocols) {
        this.ws = new WsImpl(url, protocols);
        await this.listen();
    }
    // events
    onOpen(fn) {
        this.onOpenHandlers.push(fn);
    }
    /**
     * Native onMessage event. DO NOT USE THIS unless you really have to or for debugging purposes.
     * Proper RPC events are onRequest, onNotification, onSuccessResponse and onErrorResponse (or just awaiting response).
     * @param {RpcMessageEventFunction} fn
     * @memberof RpcWebSocketClient
     */
    onAnyMessage(fn) {
        this.onAnyMessageHandlers.push(fn);
    }
    onError(fn) {
        this.onErrorHandlers.push(fn);
    }
    onClose(fn) {
        this.onCloseHandlers.push(fn);
    }
    /**
     * Appends onmessage listener on native websocket with RPC handlers.
     * If onmessage function was already there, it will call it on beggining.
     * Useful if you want to use RPC WebSocket Client on already established WebSocket along with function changeSocket().
     * @memberof RpcWebSocketClient
     */
    listenMessages() {
        let previousOnMessage;
        if (this.ws.onmessage) {
            previousOnMessage = this.ws.onmessage.bind(this.ws);
        }
        this.ws.onmessage = (e) => {
            if (previousOnMessage) {
                previousOnMessage(e);
            }
            for (const handler of this.onAnyMessageHandlers) {
                handler(e);
            }
            const data = JSON.parse(e.data);
            if (this.isNotification(data)) {
                // notification
                for (const handler of this.onNotification) {
                    handler(data);
                }
            }
            else if (this.isRequest(data)) {
                // request
                for (const handler of this.onRequest) {
                    handler(data);
                }
                // responses
            }
            else if (this.isSuccessResponse(data)) {
                // success
                for (const handler of this.onSuccessResponse) {
                    handler(data);
                }
                // resolve awaiting function
                this.idAwaiter[data.id](data.result);
            }
            else if (this.isErrorResponse(data)) {
                // error
                for (const handler of this.onErrorResponse) {
                    handler(data);
                }
                // resolve awaiting function
                this.idAwaiter[data.id](data.error);
            }
        };
    }
    // communication
    /**
     * Creates and sends RPC request. Resolves when appropirate response is returned from server or after config.responseTimeout.
     * @param {string} method
     * @param {*} [params]
     * @returns
     * @memberof RpcWebSocketClient
     */
    call(method, params) {
        return new Promise((resolve, reject) => {
            const data = this.buildRequest(method, params);
            // give limited time for response
            let timeout;
            if (this.config.responseTimeout) {
                timeout = setTimeout(() => {
                    // stop waiting for response
                    delete this.idAwaiter[data.id];
                    reject(`Awaiting response to: ${method} with id: ${data.id} timed out.`);
                }, this.config.responseTimeout);
            }
            // expect response
            this.idAwaiter[data.id] = (responseData) => {
                // stop timeout
                clearInterval(timeout);
                // stop waiting for response
                delete this.idAwaiter[data.id];
                if (this.isRpcError(responseData)) {
                    reject(responseData);
                    return;
                }
                resolve(responseData);
            };
            this.ws.send(fastJson(data));
        });
    }
    /**
     * Creates and sends RPC Notification.
     * @param {string} method
     * @param {*} [params]
     * @memberof RpcWebSocketClient
     */
    notify(method, params) {
        this.ws.send(fastJson(this.buildNotification(method, params)));
    }
    // setup
    /**
     * You can provide custom id generation function to replace default uuid/v1.
     * @param {() => string} idFn
     * @memberof RpcWebSocketClient
     */
    customId(idFn) {
        this.idFn = idFn;
    }
    /**
     * Removed jsonrpc from sent messages. Good if you don't care about standards or need better performance.
     * @memberof RpcWebSocketClient
     */
    noRpc() {
        this.buildRequest = this.buildRequestBase;
        this.buildNotification = this.buildNotificationBase;
        this.buildRpcSuccessResponse = this.buildRpcSuccessResponseBase;
        this.buildRpcErrorResponse = this.buildRpcErrorResponseBase;
    }
    /**
     * Allows modifying configuration.
     * @param {RpcWebSocketConfig} options
     * @memberof RpcWebSocketClient
     */
    configure(options) {
        Object.assign(this.config, options);
    }
    /**
     * Allows you to change used native WebSocket client to another one.
     * If you have already-connected WebSocket, use this with listenMessages().
     * @param {WebSocket} ws
     * @memberof RpcWebSocketClient
     */
    changeSocket(ws) {
        this.ws = ws;
    }
    // private
    // events
    listen() {
        return new Promise((resolve, reject) => {
            this.ws.onopen = (e) => {
                for (const handler of this.onOpenHandlers) {
                    handler(e);
                }
                resolve();
            };
            // listen for messages
            this.listenMessages();
            // called before onclose
            this.ws.onerror = (e) => {
                for (const handler of this.onErrorHandlers) {
                    handler(e);
                }
            };
            this.ws.onclose = (e) => {
                for (const handler of this.onCloseHandlers) {
                    handler(e);
                }
                reject();
            };
        });
    }
    // request
    buildRequest(method, params) {
        const data = this.buildRequestBase(method, params);
        data.jsonrpc = RpcVersions.RPC_VERSION;
        return data;
    }
    buildRequestBase(method, params) {
        const data = {};
        data.id = this.idFn();
        data.method = method;
        if (params) {
            data.params = params;
        }
        return data;
    }
    // notification
    buildNotification(method, params) {
        const data = this.buildNotificationBase(method, params);
        data.jsonrpc = RpcVersions.RPC_VERSION;
        return data;
    }
    buildNotificationBase(method, params) {
        const data = {};
        data.method = method;
        if (params) {
            data.params = params;
        }
        return data;
    }
    // success response
    buildRpcSuccessResponse(id, result) {
        const data = this.buildRpcSuccessResponseBase(id, result);
        data.jsonrpc = RpcVersions.RPC_VERSION;
        return data;
    }
    buildRpcSuccessResponseBase(id, result) {
        const data = {};
        data.id = id;
        data.result = result;
        return data;
    }
    // error response
    buildRpcErrorResponse(id, error) {
        const data = this.buildRpcErrorResponseBase(id, error);
        data.jsonrpc = RpcVersions.RPC_VERSION;
        return data;
    }
    buildRpcErrorResponseBase(id, error) {
        const data = {};
        data.id = id;
        data.error = error;
        return data;
    }
    idFn() {
        return uuid_1.v1();
    }
    // tests
    isNotification(data) {
        return !data.id;
    }
    isRequest(data) {
        return data.method;
    }
    isSuccessResponse(data) {
        return data.hasOwnProperty(`result`);
    }
    isErrorResponse(data) {
        return data.hasOwnProperty(`error`);
    }
    isRpcError(data) {
        return typeof data.code !== 'undefined';
    }
}
exports.RpcWebSocketClient = RpcWebSocketClient;
exports.default = RpcWebSocketClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0JBQTBCO0FBRTFCLG9DQUFvQztBQUNwQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUNoRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFZeEMsSUFBWSxXQUVYO0FBRkQsV0FBWSxXQUFXO0lBQ25CLGtDQUFtQixDQUFBO0FBQ3ZCLENBQUMsRUFGVyxXQUFXLEdBQVgsbUJBQVcsS0FBWCxtQkFBVyxRQUV0QjtBQTRDRCxNQUFhLGtCQUFrQjtJQXVCM0IsY0FBYztJQUNkOzs7O09BSUc7SUFDSDtRQXpCUSxjQUFTLEdBRWIsRUFBRSxDQUFDO1FBRUMsbUJBQWMsR0FBdUIsRUFBRSxDQUFDO1FBQ3hDLHlCQUFvQixHQUE4QixFQUFFLENBQUM7UUFFckQsbUJBQWMsR0FBMkIsRUFBRSxDQUFDO1FBQzVDLGNBQVMsR0FBc0IsRUFBRSxDQUFDO1FBQ2xDLHNCQUFpQixHQUE4QixFQUFFLENBQUM7UUFDbEQsb0JBQWUsR0FBNEIsRUFBRSxDQUFDO1FBRTlDLG9CQUFlLEdBQXVCLEVBQUUsQ0FBQztRQUN6QyxvQkFBZSxHQUE0QixFQUFFLENBQUM7UUFFOUMsV0FBTSxHQUF3QjtZQUNsQyxlQUFlLEVBQUUsS0FBSztTQUN6QixDQUFDO1FBU0UsSUFBSSxDQUFDLEVBQUUsR0FBRyxTQUFnQixDQUFDO0lBQy9CLENBQUM7SUFFRCxTQUFTO0lBQ1Q7Ozs7O09BS0c7SUFDSSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQVcsRUFBRSxTQUE2QjtRQUMzRCxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNyQyxNQUFNLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUN4QixDQUFD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
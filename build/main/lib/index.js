"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
/* tslint:disable:no-var-requires */
const fastJson = require('fast-json-stringify');
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
        this.ws = new WebSocket(url, protocols);
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
        return data.result;
    }
    isErrorResponse(data) {
        return data.error;
    }
    isRpcError(data) {
        return typeof data.code !== 'undefined';
    }
}
exports.RpcWebSocketClient = RpcWebSocketClient;
exports.default = RpcWebSocketClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0JBQTBCO0FBRTFCLG9DQUFvQztBQUNwQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQWFoRCxJQUFZLFdBRVg7QUFGRCxXQUFZLFdBQVc7SUFDbkIsa0NBQW1CLENBQUE7QUFDdkIsQ0FBQyxFQUZXLFdBQVcsR0FBWCxtQkFBVyxLQUFYLG1CQUFXLFFBRXRCO0FBMENELE1BQWEsa0JBQWtCO0lBdUIzQixjQUFjO0lBQ2Q7Ozs7T0FJRztJQUNIO1FBekJRLGNBQVMsR0FFYixFQUFFLENBQUM7UUFFQyxtQkFBYyxHQUF1QixFQUFFLENBQUM7UUFDeEMseUJBQW9CLEdBQThCLEVBQUUsQ0FBQztRQUVyRCxtQkFBYyxHQUEyQixFQUFFLENBQUM7UUFDNUMsY0FBUyxHQUFzQixFQUFFLENBQUM7UUFDbEMsc0JBQWlCLEdBQThCLEVBQUUsQ0FBQztRQUNsRCxvQkFBZSxHQUE0QixFQUFFLENBQUM7UUFFOUMsb0JBQWUsR0FBdUIsRUFBRSxDQUFDO1FBQ3pDLG9CQUFlLEdBQTRCLEVBQUUsQ0FBQztRQUU5QyxXQUFNLEdBQXVCO1lBQ2pDLGVBQWUsRUFBRSxLQUFLO1NBQ3pCLENBQUM7UUFTRSxJQUFJLENBQUMsRUFBRSxHQUFHLFNBQWdCLENBQUM7SUFDL0IsQ0FBQztJQUVELFNBQVM7SUFDVDs7Ozs7T0FLRztJQUNJLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBVyxFQUFFLFNBQTZCO1FBQzNELElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxTQUFTLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFFRCxTQUFTO0lBQ0YsTUFBTSxDQUFDLEVBQW9CO1FBQzlCLElBQUksQ0FB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
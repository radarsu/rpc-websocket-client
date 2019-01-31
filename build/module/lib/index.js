import { v1 } from 'uuid';
/* tslint:disable:no-var-requires */
const fastJson = require('fast-json-stringify');
export var RpcVersions;
(function (RpcVersions) {
    RpcVersions["RPC_VERSION"] = "2.0";
})(RpcVersions || (RpcVersions = {}));
export class RpcWebSocketClient {
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
        return v1();
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
export default RpcWebSocketClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFFMUIsb0NBQW9DO0FBQ3BDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBWWhELE1BQU0sQ0FBTixJQUFZLFdBRVg7QUFGRCxXQUFZLFdBQVc7SUFDbkIsa0NBQW1CLENBQUE7QUFDdkIsQ0FBQyxFQUZXLFdBQVcsS0FBWCxXQUFXLFFBRXRCO0FBNENELE1BQU0sT0FBTyxrQkFBa0I7SUF1QjNCLGNBQWM7SUFDZDs7OztPQUlHO0lBQ0g7UUF6QlEsY0FBUyxHQUViLEVBQUUsQ0FBQztRQUVDLG1CQUFjLEdBQXVCLEVBQUUsQ0FBQztRQUN4Qyx5QkFBb0IsR0FBOEIsRUFBRSxDQUFDO1FBRXJELG1CQUFjLEdBQTJCLEVBQUUsQ0FBQztRQUM1QyxjQUFTLEdBQXNCLEVBQUUsQ0FBQztRQUNsQyxzQkFBaUIsR0FBOEIsRUFBRSxDQUFDO1FBQ2xELG9CQUFlLEdBQTRCLEVBQUUsQ0FBQztRQUU5QyxvQkFBZSxHQUF1QixFQUFFLENBQUM7UUFDekMsb0JBQWUsR0FBNEIsRUFBRSxDQUFDO1FBRTlDLFdBQU0sR0FBd0I7WUFDbEMsZUFBZSxFQUFFLEtBQUs7U0FDekIsQ0FBQztRQVNFLElBQUksQ0FBQyxFQUFFLEdBQUcsU0FBZ0IsQ0FBQztJQUMvQixDQUFDO0lBRUQsU0FBUztJQUNUOzs7OztPQUtHO0lBQ0ksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFXLEVBQUUsU0FBNkI7UUFDM0QsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLFNBQVMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDeEMsTUFBTSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUVELFNBQVM7SUFDRixN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
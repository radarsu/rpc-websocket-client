export declare type RpcEventFunction = (e: Event) => void;
export declare type RpcMessageEventFunction = (e: MessageEvent) => void;
export declare type RpcCloseEventFunction = (e: CloseEvent) => void;
export declare type RpcId = string | number;
export declare type RpcNotificationEvent = (data: RpcNotification) => void;
export declare type RpcRequestEvent = (data: RpcRequest) => void;
export declare type RpcSuccessResponseEvent = (data: RpcSuccessResponse) => void;
export declare type RpcErrorResponseEvent = (data: RpcErrorResponse) => void;
export declare enum RpcVersions {
    RPC_VERSION = "2.0"
}
export interface RpcData {
    method: string;
    params?: any;
}
export interface RpcNotification extends RpcData {
    jsonrpc: RpcVersions.RPC_VERSION;
}
export interface RpcRequest extends RpcNotification {
    id: RpcId;
}
export interface RpcResponse {
    id: RpcId;
    jsonrpc: RpcVersions.RPC_VERSION;
}
export interface RpcSuccessResponse extends RpcResponse {
    result: string;
}
export interface RpcError {
    code: number;
    message: string;
    data?: any;
}
export interface RpcErrorResponse extends RpcResponse {
    error: RpcError;
}
export interface RpcWebSocketConfig {
    responseTimeout: number;
}
export declare type RpcUnidentifiedMessage = RpcRequest | RpcNotification | RpcSuccessResponse | RpcErrorResponse;
export declare class RpcWebSocketClient {
    ws: WebSocket;
    private idAwaiter;
    private onOpenHandlers;
    private onAnyMessageHandlers;
    private onNotification;
    private onRequest;
    private onSuccessResponse;
    private onErrorResponse;
    private onErrorHandlers;
    private onCloseHandlers;
    private config;
    /**
     * Does not start WebSocket connection!
     * You need to call connect() method first.
     * @memberof RpcWebSocketClient
     */
    constructor();
    /**
     * Starts WebSocket connection. Returns Promise when connection is established.
     * @param {string} url
     * @param {(string | string[])} [protocols]
     * @memberof RpcWebSocketClient
     */
    connect(url: string, protocols?: string | string[]): Promise<void>;
    onOpen(fn: RpcEventFunction): void;
    /**
     * Native onMessage event. DO NOT USE THIS unless you really have to or for debugging purposes.
     * Proper RPC events are onRequest, onNotification, onSuccessResponse and onErrorResponse (or just awaiting response).
     * @param {RpcMessageEventFunction} fn
     * @memberof RpcWebSocketClient
     */
    onAnyMessage(fn: RpcMessageEventFunction): void;
    onError(fn: RpcEventFunction): void;
    onClose(fn: RpcCloseEventFunction): void;
    /**
     * Appends onmessage listener on native websocket with RPC handlers.
     * If onmessage function was already there, it will call it on beggining.
     * Useful if you want to use RPC WebSocket Client on already established WebSocket along with function changeSocket().
     * @memberof RpcWebSocketClient
     */
    listenMessages(): void;
    /**
     * Creates and sends RPC request. Resolves when appropirate response is returned from server or after config.responseTimeout.
     * @param {string} method
     * @param {*} [params]
     * @returns
     * @memberof RpcWebSocketClient
     */
    call(method: string, params?: any): Promise<{}>;
    /**
     * Creates and sends RPC Notification.
     * @param {string} method
     * @param {*} [params]
     * @memberof RpcWebSocketClient
     */
    notify(method: string, params?: any): void;
    /**
     * You can provide custom id generation function to replace default uuid/v1.
     * @param {() => string} idFn
     * @memberof RpcWebSocketClient
     */
    customId(idFn: () => string): void;
    /**
     * Removed jsonrpc from sent messages. Good if you don't care about standards or need better performance.
     * @memberof RpcWebSocketClient
     */
    noRpc(): void;
    /**
     * Allows modifying configuration.
     * @param {RpcWebSocketConfig} options
     * @memberof RpcWebSocketClient
     */
    configure(options: RpcWebSocketConfig): void;
    /**
     * Allows you to change used native WebSocket client to another one.
     * If you have already-connected WebSocket, use this with listenMessages().
     * @param {WebSocket} ws
     * @memberof RpcWebSocketClient
     */
    changeSocket(ws: WebSocket): void;
    private listen;
    private buildRequest;
    private buildRequestBase;
    private buildNotification;
    private buildNotificationBase;
    private buildRpcSuccessResponse;
    private buildRpcSuccessResponseBase;
    private buildRpcErrorResponse;
    private buildRpcErrorResponseBase;
    private idFn;
    private isNotification;
    private isRequest;
    private isSuccessResponse;
    private isErrorResponse;
    private isRpcError;
}
export default RpcWebSocketClient;

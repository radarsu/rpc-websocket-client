<p align="center">
    <a href="https://github.com/radarsu/radarsu/" target="blank"><img src="https://raw.githubusercontent.com/radarsu/rpc-websocket-client/master/assets/rpc-websocket-client-logo.png" alt="rpc-websocket-client" /></a><br/>
    <strong>Fast JSON RPC 2.0 written in TypeScript.</strong>
</p>

<p align="center">
<a href="https://github.com/Microsoft/TypeScript" target="blank">TypeScript</a> <a href="https://www.jsonrpc.org/specification" target="_blank" alt="JSON RPC 2.0">JSON RPC 2.0</a> WebSocket implementation with async-await Promises.<br/>
</p>

## Description

I really lacked typescript support or type definitions of <a href="https://github.com/radarsu/rpc-websocket-client" target="_blank" alt="rpc-websockets">rpc-websockets</a>. I kept everything as simple as possible for <strong>best performance</strong> and used <a href="https://github.com/fastify/fast-json-stringify" target="_blank" alt="fast-json-strongify">fast-json-strongify</a> for much faster JSON communication. Under the hood id-generation for requests and notifications is done using <a href="https://github.com/kelektiv/node-uuid" target="_blank" alt="uuid">uuid/v1</a> to provide id uniqueness as an additional feature.

## Installation

```sh
npm i rpc-websocket-client
```

## Features

- <strong>TypeScript</strong> with documentation in comments.
- <strong>Fast JSON parsing</strong> of incoming requests by <a href="https://github.com/fastify/fast-json-stringify" target="_blank" alt="fast-json-strongify">fast-json-strongify</a>.
- <strong>Unique RPC identifiers</strong> by <a href="https://github.com/kelektiv/node-uuid" target="_blank" alt="uuid">uuid/v1</a>.
- <strong>Lightweight</strong>. Allows you to call noRpc() method to prevent sending `jsonrpc: '2.0'` overhead from all messages if you'd like to ignore the <a href="https://www.jsonrpc.org/specification" target="_blank" alt="JSON RPC 2.0">JSON RPC 2.0</a> standard for better performance.
- Option to <strong>connect RpcWebSocketClient with already existing WebSocket</strong> with `changeSocket()` and `listenMessages()` methods. Useful if you use <strong>REST or GraphQL implementation of another library</strong> and want to handle <a href="https://www.jsonrpc.org/specification" target="_blank" alt="JSON RPC 2.0">JSON RPC 2.0</a> when communicating from server to client (that was my use case to develop this package).

## Basic Usage
```ts
import { RpcWebSocketClient } from 'rpc-websocket-client';

(async () => {

    const rpc = new RpcWebSocketClient();

    await rpc.connect(`ws://localhost:4000/`);
    // connection established

    // let's hope there will be no error or it will be catched in some wrapper
    await rpc.call(`auth.login`, [`rpcMaster`, `mySecretPassword`]);

    // now lets be pesimistic
    await rpc.call(`auth.login`, [`rpcMaster`, `mySecretPassword`]).then(() => {
        // woohoo, user logged!
    }).catch((err) => {

        // err is typeof RpcError (code: number, message: string, data?: any)
        await rpc.call(`auth.signup`, {
            login: `rpcMaster`,
            password: `mySecretPassword`,
        });

    });

    rpc.notify(`btw.iHateYou`, [`over and out`]);
})();
```

## Advanced Usage
```ts
(async () => {
    // lets say you use WebSocket implementation for GraphQL Client -> Server communication
    // e.g. Apollo, and it's already connected
    // but you want to handle some of the Server -> Client communication with RPC

    const ws = (apollo as any).client.wsImpl;
    const rpc = new RpcWebSocketClient();

    rpc.onRequest((data) => {       // data is typeof RpcRequest
        // controller-like stuff
    });

    rpc.onNotification((data) => {  // data is typeof RpcNotification
        // notification handling
    });

    // here goes magic for listening to already-connected socket
    rpc.changeSocket(ws);
    rpc.listenMessages();
})();
```

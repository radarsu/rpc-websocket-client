<p align="center">
    <a href="https://github.com/radarsu/radarsu/" target="blank"><img src="https://github.com/radarsu/rpc-websocket-client/blob/master/assets/rpc-websocket-client-logo.png" alt="rpc-websocket-client" /></a><br/>
    <strong>Fast JSON RPC 2.0 written in TypeScript</strong>
</p>

<p align="center">
<a href="https://github.com/Microsoft/TypeScript" target="blank">TypeScript</a> JSON RPC 2.0 WebSocket implementation with async-await Promises.<br/>
</p>

## Description
I really lacked typescript support or type definitions of <a href="https://github.com/radarsu/rpc-websocket-client" target="_blank" alt="rpc-websockets">rpc-websockets</a>. I kept everything as simple as possible for <strong>best performance</strong> and used <a href="https://github.com/fastify/fast-json-stringify" target="_blank" alt="fast-json-strongify">fast-json-strongify</a> for much faster JSON communication. Under the hood RPC id for requests and notifications is generated using <a href="https://github.com/kelektiv/node-uuid" target="_blank" alt="uuid">uuid/v1</a> to provide id uniqueness as additional feature.

## Installation
```sh
npm i rpc-websocket-client
```

## Features
- <strong>TypeScript</strong> with documentation in comments.
- <strong>Fast JSON parsing</strong> of incoming requests done by <a href="https://github.com/fastify/fast-json-stringify" target="_blank" alt="fast-json-strongify">fast-json-strongify</a>.
- <strong>Unique RPC identifiers</strong>.
- Option to append RpcWebSocketClient to already existing WebSocket with changeSocket() and listenMessages() methods. Useful if you use <strong>REST or GraphQL implementation of another library</strong> and want to handle RPC 2.0 when communicating from server to client (that was my use case to develop this package).
- <strong>Lightweight</strong>, allows you to call noRpc() method to prevent sending `jsonrpc: '2.0'` information from all messages if you'd like to ignore the JSON RPC 2.0 standard overhead for better performance.
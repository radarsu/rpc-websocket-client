import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { WsAdapter } from '@nestjs/platform-ws';

import { RpcWebSocketClient, IRpcResponse } from '../src/rpc-websocket-client';

import { EventsModule } from '../__tests-utils__/events.module';
import { testConfig } from '../__tests-utils__/config';

describe('WebSocket', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const mod = await Test.createTestingModule({
            imports: [EventsModule],
        }).compile();

        app = mod.createNestApplication();
        app.useWebSocketAdapter(new WsAdapter());
        await app.listen(testConfig.port);
    });

    it(`RpcWebSocketClient`, async () => {
        const ws = new RpcWebSocketClient();

        await ws.connect(`ws://127.0.0.1:${testConfig.port}`);

        const method = `test`;
        const params = [method];
        const res: any = await ws.call(method, params);

        expect(res).toMatchObject({
            id: res.id,
            method,
            params,
            jsonrpc: '2.0',
        });
    });

    afterAll(async () => {
        await app.close();
    });
});

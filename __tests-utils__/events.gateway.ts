import { Server } from 'ws';
import { WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';

import { testConfig } from './config';

@WebSocketGateway(testConfig.port)
export class EventsGateway implements OnGatewayInit {

    afterInit(server: Server) {
        server.on('connection', (ws) => {
            ws.on('message', (data: any) => {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    ws.send(JSON.stringify({
                        id: -1,
                        jsonrpc: '2.0',
                        error: {
                            code: -1,
                            message: e.message,
                        },
                    }));
                    return;
                }

                ws.send(JSON.stringify({
                    id: data.id,
                    jsonrpc: '2.0',
                    result: data,
                }));
            });
        });
    }

}

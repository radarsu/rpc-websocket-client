import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { WsAdapter } from '@nestjs/platform-ws';

import { EventsModule } from './events.module';

let app: INestApplication;
const bootstrap = async () => {

    const mod = await Test.createTestingModule({
        imports: [EventsModule],
    }).compile();

    app = mod.createNestApplication();
    app.useWebSocketAdapter(new WsAdapter());
    await app.listen(7000);

};

bootstrap().then(() => {
    //
}).catch(() => {
    //
});

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { ServerOptions } from 'socket.io';
import { AppModule } from './app.module';
import { HttpExceptionalFilter } from './utils/exceptionalFilter/exceptionalFilter';
import { Logger } from './utils/logger/logger.service';

class CorsIoAdapter extends IoAdapter {
  constructor(
    app: object,
    private readonly origin: string,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.origin, credentials: true },
    });
  }
}

async function bootstrap() {
  const logger = new Logger();
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const frontendUrl = config.getOrThrow<string>('FRONTEND_URL');

  // behind a proxy set TRUST_PROXY to the number of proxy hops, or the throttler sees one IP
  const proxyHops = Number(config.get('TRUST_PROXY') ?? 0);
  if (proxyHops > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', proxyHops);
  }

  app.use(helmet());
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: frontendUrl, credentials: true });
  app.useWebSocketAdapter(new CorsIoAdapter(app, frontendUrl));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionalFilter(app.get(HttpAdapterHost)));

  if (config.get('NODE_ENV') !== 'production') {
    const swagger = new DocumentBuilder()
      .setTitle('User API')
      .setDescription('The User API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api', app, () =>
      SwaggerModule.createDocument(app, swagger),
    );
  }

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  logger.log(`Application is running on: ${port}`);
}
bootstrap();

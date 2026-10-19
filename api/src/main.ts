import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // `whitelist` retire les champs non déclarés dans le DTO, `forbidNonWhitelisted`
  // refuse la requête : personne ne glisse un `role: 'STAFF'` dans une inscription.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  // CORS : seul le front, à cette adresse, peut lire les réponses de l'API depuis
  // un navigateur. Une seule origine, jamais '*'.
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' });

  const config = new DocumentBuilder()
    .setTitle('Forum entreprises de Castelmont')
    .setDescription('Un token avec POST /auth/login, puis « Authorize ».')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config), {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();

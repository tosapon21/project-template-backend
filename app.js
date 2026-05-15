import 'dotenv/config';
import fs from 'fs';
import https from 'https';
import path from 'path';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { graphqlUploadExpress } from 'graphql-upload';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import { NoSchemaIntrospectionCustomRule } from 'graphql';

import isAuth from './middleware/auth.js';
import externalRoutes from './routes/externalRoutes.js';
import schema from './graphql/typeDefs.js';

const app = express();

app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(isAuth);
app.use('/', externalRoutes);

const isDevelopment = process.env.NODE_ENV !== 'production';
const validationRules = isDevelopment ? [] : [NoSchemaIntrospectionCustomRule];

app.use(
    '/graphql',
    graphqlUploadExpress({ maxFileSize: 5 * 1024 * 1024, maxFiles: 3 }),
    graphqlHTTP((req) => ({
        schema,
        graphiql: isDevelopment,
        validationRules,
        context: { req },
        customFormatErrorFn: (err) => {
            const status = err.originalError?.status || 500;
            const message = err.originalError?.message || err.message || 'Internal server error';
            if (!isDevelopment && status === 500) {
                return { message: 'Internal server error', status };
            }
            return { message, status };
        }
    }))
);

const port = process.env.PORT || 8080;
const useHttps = isDevelopment && process.env.USE_HTTPS !== 'false';
const sslKeyPath = path.resolve(process.cwd(), process.env.SSL_KEY_PATH || './ssl/localhost.key');
const sslCertPath = path.resolve(process.cwd(), process.env.SSL_CERT_PATH || './ssl/localhost.crt');

if (useHttps) {
    try {
        const key = fs.readFileSync(sslKeyPath);
        const cert = fs.readFileSync(sslCertPath);
        https.createServer({ key, cert }, app).listen(port, () => {
            console.log(`Backend running on https://localhost:${port}`);
        });
    } catch (err) {
        console.warn(`SSL setup failed (${err.message}). Starting HTTP server instead.`);
        app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));
    }
} else {
    app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));
}

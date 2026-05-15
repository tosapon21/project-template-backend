import 'dotenv/config';
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

app.listen(process.env.PORT || 8080);

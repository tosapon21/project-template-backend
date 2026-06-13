import { mergeTypeDefs } from '@graphql-tools/merge';
import { makeExecutableSchema } from '@graphql-tools/schema';
import userType from './types/userType.js';
import adminType from './types/adminType.js';
import languageType from './types/languageType.js';
import webTextType from './types/webTextType.js';
import resolvers from './resolvers.js';

const baseType = `
    type Query { _empty: String }
    type Mutation { _empty: String }
`;

const typeDefs = mergeTypeDefs([baseType, userType, adminType, languageType, webTextType]);

export default makeExecutableSchema({ typeDefs, resolvers });

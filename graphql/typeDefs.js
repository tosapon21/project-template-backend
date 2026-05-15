import { mergeTypeDefs } from '@graphql-tools/merge';
import { makeExecutableSchema } from '@graphql-tools/schema';
import userType from './types/userType.js';
import adminType from './types/adminType.js';
import resolvers from './resolvers.js';

const baseType = `
    type Query { _empty: String }
    type Mutation { _empty: String }
`;

const typeDefs = mergeTypeDefs([baseType, userType, adminType]);

export default makeExecutableSchema({ typeDefs, resolvers });
